/**
 * Custom Field Service Unit Tests
 * Tests for custom field definitions and value management
 */

import { CustomFieldService } from '../../../backend/core/metadata/metadata-service'
import { metadataRepository } from '../../../backend/core/metadata/metadata-repository'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors'

jest.mock('../../../backend/core/metadata/metadata-repository')

describe('CustomFieldService', () => {
  let customFieldService: CustomFieldService
  const tenantId = 'tenant-123'

  beforeEach(() => {
    customFieldService = new CustomFieldService()
    jest.clearAllMocks()
  })

  describe('createCustomField', () => {
    it('should successfully create custom field with valid data', async () => {
      const input = {
        entityType: 'contact',
        fieldType: 'text',
        fieldLabel: 'Company Size',
        fieldName: 'company_size',
        isRequired: false,
        isVisible: true,
      }

      const mockField = {
        id: 'field-123',
        tenantId,
        ...input,
        displayOrder: 1,
        createdAt: new Date(),
      }

      ;(metadataRepository.listCustomFields as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });
      (metadataRepository.createCustomField as jest.Mock).mockResolvedValue(mockField)

      const result = await customFieldService.createCustomField(tenantId, input)

      expect(result).toEqual(mockField)
      expect(metadataRepository.createCustomField).toHaveBeenCalledWith(tenantId, input)
    })

    it('should create select field with options', async () => {
      const input = {
        entityType: 'contact',
        fieldType: 'select',
        fieldLabel: 'Industry',
        fieldName: 'industry',
        fieldOptions: ['Technology', 'Healthcare', 'Finance', 'Retail'],
      }

      const mockField = {
        id: 'field-123',
        tenantId,
        ...input,
        createdAt: new Date(),
      }

      ;(metadataRepository.listCustomFields as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });
      (metadataRepository.createCustomField as jest.Mock).mockResolvedValue(mockField)

      const result = await customFieldService.createCustomField(tenantId, input)

      expect(result).toEqual(mockField)
      expect(result.fieldOptions).toEqual(input.fieldOptions)
    })

    it('should create number field with validation rules', async () => {
      const input = {
        entityType: 'deal',
        fieldType: 'number',
        fieldLabel: 'Discount Percentage',
        fieldName: 'discount_pct',
        validationRules: {
          min: 0,
          max: 100,
        },
      }

      const mockField = {
        id: 'field-123',
        tenantId,
        ...input,
        createdAt: new Date(),
      }

      ;(metadataRepository.listCustomFields as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });
      (metadataRepository.createCustomField as jest.Mock).mockResolvedValue(mockField)

      const result = await customFieldService.createCustomField(tenantId, input)

      expect(result.validationRules).toEqual(input.validationRules)
    })
  })

  describe('getCustomFieldById', () => {
    it('should return custom field when found', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'text',
        fieldLabel: 'Company Size',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      const result = await customFieldService.getCustomFieldById('field-123', tenantId)

      expect(result).toEqual(mockField)
    })

    it('should throw NotFoundError when field not found', async () => {
      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(null)

      await expect(
        customFieldService.getCustomFieldById('field-123', tenantId)
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('updateCustomField', () => {
    it('should successfully update custom field', async () => {
      const existingField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'text',
        fieldLabel: 'Old Label',
        fieldName: 'old_name',
      }

      const updateData = {
        fieldLabel: 'New Label',
        isRequired: true,
      }

      const updatedField = {
        ...existingField,
        ...updateData,
        updatedAt: new Date(),
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(existingField)
      ;(metadataRepository.updateCustomField as jest.Mock).mockResolvedValue(updatedField)

      const result = await customFieldService.updateCustomField('field-123', tenantId, updateData)

      expect(result).toEqual(updatedField)
      expect(metadataRepository.updateCustomField).toHaveBeenCalledWith(
        'field-123',
        tenantId,
        updateData
      )
    })

    it('should update select field options', async () => {
      const existingField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'select',
        fieldLabel: 'Industry',
        fieldOptions: ['Tech', 'Finance'],
      }

      const updateData = {
        fieldOptions: ['Technology', 'Healthcare', 'Finance', 'Retail'],
      }

      const updatedField = {
        ...existingField,
        ...updateData,
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(existingField)
      ;(metadataRepository.updateCustomField as jest.Mock).mockResolvedValue(updatedField)

      const result = await customFieldService.updateCustomField('field-123', tenantId, updateData)

      expect(result.fieldOptions).toEqual(updateData.fieldOptions)
    })
  })

  describe('deleteCustomField', () => {
    it('should successfully delete custom field', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)
      ;(metadataRepository.deleteCustomField as jest.Mock).mockResolvedValue(undefined)

      await customFieldService.deleteCustomField('field-123', tenantId)

      expect(metadataRepository.deleteCustomField).toHaveBeenCalledWith('field-123', tenantId)
    })

    it('should throw NotFoundError when field does not exist', async () => {
      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(null)

      await expect(
        customFieldService.deleteCustomField('field-123', tenantId)
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('setCustomFieldValue', () => {
    it('should successfully set text field value', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'text',
        fieldLabel: 'Company Name',
        isRequired: false,
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'contact',
        entityId: 'contact-123',
        value: 'Acme Corporation',
      }

      const mockValue = {
        id: 'value-123',
        tenantId,
        ...input,
        createdAt: new Date(),
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)
      ;(metadataRepository.setCustomFieldValue as jest.Mock).mockResolvedValue(mockValue)

      const result = await customFieldService.setCustomFieldValue(tenantId, input)

      expect(result).toEqual(mockValue)
    })

    it('should throw ValidationError for wrong entity type', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'text',
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'deal', // Wrong entity type
        entityId: 'deal-123',
        value: 'Test',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Custom field is not valid for entity type "deal"')
    })

    it('should throw ValidationError for required field with empty value', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'text',
        fieldLabel: 'Required Field',
        isRequired: true,
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'contact',
        entityId: 'contact-123',
        value: '',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Field "Required Field" is required')
    })

    it('should validate email format', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'email',
        fieldLabel: 'Work Email',
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'contact',
        entityId: 'contact-123',
        value: 'invalid-email',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Value must be a valid email address')
    })

    it('should validate URL format', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'url',
        fieldLabel: 'Website',
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'contact',
        entityId: 'contact-123',
        value: 'not-a-url',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Value must be a valid URL')
    })

    it('should validate phone format', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'contact',
        fieldType: 'phone',
        fieldLabel: 'Phone',
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'contact',
        entityId: 'contact-123',
        value: 'abc', // Invalid characters
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Value must be a valid phone number')
    })

    it('should validate number type', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'deal',
        fieldType: 'number',
        fieldLabel: 'Discount',
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'deal',
        entityId: 'deal-123',
        value: 'not-a-number',
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Value must be a valid number')
    })

    it('should apply min/max validation rules for numbers', async () => {
      const mockField = {
        id: 'field-123',
        tenantId,
        entityType: 'deal',
        fieldType: 'number',
        fieldLabel: 'Discount',
        validationRules: {
          min: 0,
          max: 100,
        },
      }

      const input = {
        fieldId: 'field-123',
        entityType: 'deal',
        entityId: 'deal-123',
        value: '150', // Exceeds max
      }

      ;(metadataRepository.findCustomFieldById as jest.Mock).mockResolvedValue(mockField)

      await expect(
        customFieldService.setCustomFieldValue(tenantId, input)
      ).rejects.toThrow('Discount must be at most 100')
    })
  })

  describe('getCustomFieldValues', () => {
    it('should get all values for an entity', async () => {
      const mockValues = [
        {
          id: 'value-1',
          fieldId: 'field-1',
          entityType: 'contact',
          entityId: 'contact-123',
          value: 'Value 1',
        },
        {
          id: 'value-2',
          fieldId: 'field-2',
          entityType: 'contact',
          entityId: 'contact-123',
          value: 'Value 2',
        },
      ]

      ;(metadataRepository.getCustomFieldValues as jest.Mock).mockResolvedValue(mockValues)

      const result = await customFieldService.getCustomFieldValues(
        tenantId,
        'contact',
        'contact-123'
      )

      expect(result).toEqual(mockValues)
      expect(metadataRepository.getCustomFieldValues).toHaveBeenCalledWith(
        tenantId,
        'contact',
        'contact-123'
      )
    })
  })

  describe('getCustomFieldsWithValues', () => {
    it('should merge fields with values', async () => {
      const mockFields = {
        items: [
          {
            id: 'field-1',
            fieldLabel: 'Company Size',
            fieldType: 'text',
          },
          {
            id: 'field-2',
            fieldLabel: 'Industry',
            fieldType: 'select',
          },
        ],
        total: 2,
      }

      const mockValues = [
        {
          id: 'value-1',
          fieldId: 'field-1',
          value: 'Large',
        },
      ]

      ;(metadataRepository.listCustomFields as jest.Mock).mockResolvedValue(mockFields)
      ;(metadataRepository.getCustomFieldValues as jest.Mock).mockResolvedValue(mockValues)

      const result = await customFieldService.getCustomFieldsWithValues(
        tenantId,
        'contact',
        'contact-123'
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'field-1',
        value: 'Large',
      })
      expect(result[1]).toMatchObject({
        id: 'field-2',
        value: null, // No value set
      })
    })
  })
})
