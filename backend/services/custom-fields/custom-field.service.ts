/**
 * Custom Fields Service
 * Manages dynamic custom fields for entities (contacts, deals, companies, etc.)
 * Supports various field types: text, number, date, select, multi-select, checkbox, url, email, phone
 */

import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

export interface CustomField {
  id: string;
  tenantId: string;
  entityType: 'contact' | 'deal' | 'company' | 'lead' | 'ticket' | 'project';
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi-select' | 'checkbox' | 'url' | 'email' | 'phone' | 'textarea' | 'currency';
  fieldOptions?: string[]; // For select/multi-select
  defaultValue?: any;
  required: boolean;
  order: number;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldValue {
  id: string;
  tenantId: string;
  fieldId: string;
  entityId: string;
  entityType: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFieldParams {
  tenantId: string;
  entityType: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  fieldOptions?: string[];
  defaultValue?: any;
  required?: boolean;
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface UpdateCustomFieldParams {
  fieldLabel?: string;
  fieldOptions?: string[];
  defaultValue?: any;
  required?: boolean;
  metadata?: Record<string, any>;
}

export interface SetCustomFieldValueParams {
  tenantId: string;
  fieldId: string;
  entityId: string;
  entityType: string;
  value: any;
}

export class CustomFieldService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Create a new custom field definition
   */
  async createCustomField(params: CreateCustomFieldParams): Promise<CustomField> {
    try {
      // Validate field name (must be alphanumeric + underscores)
      if (!/^[a-z0-9_]+$/.test(params.fieldName)) {
        throw new Error('Field name must be lowercase alphanumeric with underscores only');
      }

      // Check if field name already exists for this entity type
      const existingField = await this.pool.query(
        `SELECT id FROM custom_fields
         WHERE tenantId = $1 AND entity_type = $2 AND field_name = $3`,
        [params.tenantId, params.entityType, params.fieldName]
      );

      if (existingField.rows.length > 0) {
        throw new Error(`Field "${params.fieldName}" already exists for ${params.entityType}`);
      }

      // Get next order number
      const orderResult = await this.pool.query(
        `SELECT COALESCE(MAX("order"), 0) + 1 as next_order
         FROM custom_fields
         WHERE tenantId = $1 AND entity_type = $2`,
        [params.tenantId, params.entityType]
      );

      const nextOrder = orderResult.rows[0].next_order;

      // Create custom field
      const result = await this.pool.query(
        `INSERT INTO custom_fields (
          tenantId, entity_type, field_name, field_label, field_type,
          field_options, default_value, required, "order", metadata, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          params.tenantId,
          params.entityType,
          params.fieldName,
          params.fieldLabel,
          params.fieldType,
          JSON.stringify(params.fieldOptions || []),
          JSON.stringify(params.defaultValue),
          params.required || false,
          nextOrder,
          JSON.stringify(params.metadata || {}),
          params.createdBy,
        ]
      );

      const field = this.mapRowToCustomField(result.rows[0]);

      logger.info('[CustomFields] Custom field created', {
        tenantId: params.tenantId,
        fieldId: field.id,
        entityType: params.entityType,
        fieldName: params.fieldName,
      });

      return field;
    } catch (error: any) {
      logger.error('[CustomFields] Failed to create custom field', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Update custom field definition
   */
  async updateCustomField(
    tenantId: string,
    fieldId: string,
    updates: UpdateCustomFieldParams
  ): Promise<CustomField> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.fieldLabel !== undefined) {
        setClauses.push(`field_label = $${paramIndex}`);
        values.push(updates.fieldLabel);
        paramIndex++;
      }

      if (updates.fieldOptions !== undefined) {
        setClauses.push(`field_options = $${paramIndex}`);
        values.push(JSON.stringify(updates.fieldOptions));
        paramIndex++;
      }

      if (updates.defaultValue !== undefined) {
        setClauses.push(`default_value = $${paramIndex}`);
        values.push(JSON.stringify(updates.defaultValue));
        paramIndex++;
      }

      if (updates.required !== undefined) {
        setClauses.push(`required = $${paramIndex}`);
        values.push(updates.required);
        paramIndex++;
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new Error('No fields to update');
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(fieldId, tenantId);

      const result = await this.pool.query(
        `UPDATE custom_fields
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex} AND tenantId = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Custom field not found');
      }

      logger.info('[CustomFields] Custom field updated', {
        tenantId,
        fieldId,
      });

      return this.mapRowToCustomField(result.rows[0]);
    } catch (error: any) {
      logger.error('[CustomFields] Failed to update custom field', {
        error: error.message,
        fieldId,
      });
      throw error;
    }
  }

  /**
   * Delete custom field (soft delete - sets deleted_at)
   */
  async deleteCustomField(tenantId: string, fieldId: string): Promise<void> {
    try {
      await this.pool.query('BEGIN');

      // Soft delete the field
      const result = await this.pool.query(
        `UPDATE custom_fields
         SET deleted_at = NOW()
         WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL
         RETURNING id`,
        [fieldId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error('Custom field not found or already deleted');
      }

      // Delete all associated values
      await this.pool.query(
        `DELETE FROM custom_field_values
         WHERE field_id = $1 AND tenantId = $2`,
        [fieldId, tenantId]
      );

      await this.pool.query('COMMIT');

      logger.info('[CustomFields] Custom field deleted', {
        tenantId,
        fieldId,
      });
    } catch (error: any) {
      await this.pool.query('ROLLBACK');
      logger.error('[CustomFields] Failed to delete custom field', {
        error: error.message,
        fieldId,
      });
      throw error;
    }
  }

  /**
   * Get all custom fields for an entity type
   */
  async getCustomFields(tenantId: string, entityType: string): Promise<CustomField[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM custom_fields
         WHERE tenantId = $1 AND entity_type = $2 AND deleted_at IS NULL
         ORDER BY "order" ASC`,
        [tenantId, entityType]
      );

      return result.rows.map((row) => this.mapRowToCustomField(row));
    } catch (error: any) {
      logger.error('[CustomFields] Failed to get custom fields', {
        error: error.message,
        tenantId,
        entityType,
      });
      throw error;
    }
  }

  /**
   * Get a single custom field by ID
   */
  async getCustomField(tenantId: string, fieldId: string): Promise<CustomField | null> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM custom_fields
         WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL`,
        [fieldId, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCustomField(result.rows[0]);
    } catch (error: any) {
      logger.error('[CustomFields] Failed to get custom field', {
        error: error.message,
        fieldId,
      });
      throw error;
    }
  }

  /**
   * Reorder custom fields
   */
  async reorderCustomFields(
    tenantId: string,
    entityType: string,
    fieldIdOrder: string[]
  ): Promise<void> {
    try {
      await this.pool.query('BEGIN');

      for (let i = 0; i < fieldIdOrder.length; i++) {
        await this.pool.query(
          `UPDATE custom_fields
           SET "order" = $1, updated_at = NOW()
           WHERE id = $2 AND tenantId = $3 AND entity_type = $4`,
          [i, fieldIdOrder[i], tenantId, entityType]
        );
      }

      await this.pool.query('COMMIT');

      logger.info('[CustomFields] Custom fields reordered', {
        tenantId,
        entityType,
        count: fieldIdOrder.length,
      });
    } catch (error: any) {
      await this.pool.query('ROLLBACK');
      logger.error('[CustomFields] Failed to reorder custom fields', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Set value for a custom field
   */
  async setCustomFieldValue(params: SetCustomFieldValueParams): Promise<CustomFieldValue> {
    try {
      // Verify field exists
      const field = await this.getCustomField(params.tenantId, params.fieldId);
      if (!field) {
        throw new Error('Custom field not found');
      }

      // Validate value based on field type
      this.validateFieldValue(field, params.value);

      // Upsert value
      const result = await this.pool.query(
        `INSERT INTO custom_field_values (
          tenantId, field_id, entity_id, entity_type, value
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenantId, field_id, entity_id)
        DO UPDATE SET value = $5, updated_at = NOW()
        RETURNING *`,
        [
          params.tenantId,
          params.fieldId,
          params.entityId,
          params.entityType,
          JSON.stringify(params.value),
        ]
      );

      logger.info('[CustomFields] Custom field value set', {
        tenantId: params.tenantId,
        fieldId: params.fieldId,
        entityId: params.entityId,
      });

      return this.mapRowToCustomFieldValue(result.rows[0]);
    } catch (error: any) {
      logger.error('[CustomFields] Failed to set custom field value', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Get all custom field values for an entity
   */
  async getCustomFieldValues(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<Record<string, any>> {
    try {
      const result = await this.pool.query(
        `SELECT cf.field_name, cf.field_type, cfv.value
         FROM custom_field_values cfv
         JOIN custom_fields cf ON cfv.field_id = cf.id
         WHERE cfv.tenantId = $1 AND cfv.entity_type = $2 AND cfv.entity_id = $3
         AND cf.deleted_at IS NULL`,
        [tenantId, entityType, entityId]
      );

      const values: Record<string, any> = {};

      for (const row of result.rows) {
        try {
          values[row.field_name] = JSON.parse(row.value);
        } catch {
          values[row.field_name] = row.value;
        }
      }

      return values;
    } catch (error: any) {
      logger.error('[CustomFields] Failed to get custom field values', {
        error: error.message,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Delete custom field value
   */
  async deleteCustomFieldValue(
    tenantId: string,
    fieldId: string,
    entityId: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `DELETE FROM custom_field_values
         WHERE tenantId = $1 AND field_id = $2 AND entity_id = $3`,
        [tenantId, fieldId, entityId]
      );

      logger.info('[CustomFields] Custom field value deleted', {
        tenantId,
        fieldId,
        entityId,
      });
    } catch (error: any) {
      logger.error('[CustomFields] Failed to delete custom field value', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate field value based on field type
   */
  private validateFieldValue(field: CustomField, value: any): void {
    if (field.required && (value === null || value === undefined || value === '')) {
      throw new Error(`Field "${field.fieldLabel}" is required`);
    }

    switch (field.fieldType) {
      case 'number':
      case 'currency':
        if (value !== null && typeof value !== 'number') {
          throw new Error(`Field "${field.fieldLabel}" must be a number`);
        }
        break;

      case 'date':
      case 'datetime':
        if (value !== null && isNaN(Date.parse(value))) {
          throw new Error(`Field "${field.fieldLabel}" must be a valid date`);
        }
        break;

      case 'email':
        if (value !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error(`Field "${field.fieldLabel}" must be a valid email`);
        }
        break;

      case 'url':
        if (value !== null) {
          try {
            new URL(value);
          } catch {
            throw new Error(`Field "${field.fieldLabel}" must be a valid URL`);
          }
        }
        break;

      case 'select':
        if (value !== null && field.fieldOptions && !field.fieldOptions.includes(value)) {
          throw new Error(`Field "${field.fieldLabel}" must be one of: ${field.fieldOptions.join(', ')}`);
        }
        break;

      case 'multi-select':
        if (value !== null) {
          if (!Array.isArray(value)) {
            throw new Error(`Field "${field.fieldLabel}" must be an array`);
          }
          if (field.fieldOptions) {
            const invalidOptions = value.filter((v) => !field.fieldOptions!.includes(v));
            if (invalidOptions.length > 0) {
              throw new Error(`Invalid options for "${field.fieldLabel}": ${invalidOptions.join(', ')}`);
            }
          }
        }
        break;

      case 'checkbox':
        if (value !== null && typeof value !== 'boolean') {
          throw new Error(`Field "${field.fieldLabel}" must be a boolean`);
        }
        break;
    }
  }

  // Helper methods
  private mapRowToCustomField(row: any): CustomField {
    return {
      id: row.id,
      tenantId: row.tenantId,
      entityType: row.entity_type,
      fieldName: row.field_name,
      fieldLabel: row.field_label,
      fieldType: row.field_type,
      fieldOptions: this.parseJSON(row.field_options),
      defaultValue: this.parseJSON(row.default_value),
      required: row.required,
      order: row.order,
      metadata: this.parseJSON(row.metadata),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToCustomFieldValue(row: any): CustomFieldValue {
    return {
      id: row.id,
      tenantId: row.tenantId,
      fieldId: row.field_id,
      entityId: row.entity_id,
      entityType: row.entity_type,
      value: this.parseJSON(row.value),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private parseJSON(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}
