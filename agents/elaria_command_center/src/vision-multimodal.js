/**
 * LM Studio Vision & Multimodal Integration
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\vision-multimodal.js
 * Purpose: Image understanding, OCR, visual analysis for ClientForge CRM
 * Features: LM Studio 0.3.31+ with enhanced image processing
 */

import { LMStudioClient } from '@lmstudio/sdk';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { validateFilePath } from './utils/security.js';

// ============================================================
// VISION CLIENT
// ============================================================

export class VisionClient {
  constructor(baseUrl = 'ws://localhost:1234') {
    this.client = new LMStudioClient({ baseUrl });
    this.visionModels = [
      'qwen2.5-vl-7b',
      'qwen/qwen2.5-vl-7b',
      'gemma-3',
      'pixtral',
    ];
  }

  /**
   * Analyze image with vision model
   */
  async analyzeImage(imagePath, prompt, options = {}) {
    const spinner = ora('Loading vision model...').start();

    try {
      // Validate file path to prevent path traversal attacks
      const validatedPath = validateFilePath(imagePath);

      // Get vision model
      const model = await this.client.llm.get({
        identifier: options.model || this.visionModels[0],
      });

      spinner.text = 'Reading image...';

      // Read image as base64
      const imageBuffer = await fs.readFile(validatedPath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(validatedPath);

      spinner.text = 'Analyzing image...';

      // Send to vision model
      const response = await model.respond([
        {
          type: 'text',
          text: prompt || 'Describe this image in detail.',
        },
        {
          type: 'image',
          image: {
            data: base64Image,
            mimeType,
          },
        },
      ], {
        temperature: options.temperature || 0.2,
        maxTokens: options.maxTokens || 1024,
      });

      spinner.succeed('Image analyzed');

      return {
        success: true,
        analysis: response.content,
        model: options.model || this.visionModels[0],
        imagePath,
      };
    } catch (error) {
      spinner.fail('Image analysis failed');
      console.error(chalk.red(error.message));
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * OCR - Extract text from image
   */
  async extractText(imagePath, options = {}) {
    return this.analyzeImage(
      imagePath,
      'Extract all text from this image. Provide the text exactly as it appears, preserving formatting.',
      { ...options, temperature: 0.1 }
    );
  }

  /**
   * Document analysis - Analyze business documents
   */
  async analyzeDocument(imagePath, documentType = 'general') {
    const prompts = {
      general: 'Analyze this document and extract: title, key information, important dates, action items, and summary.',
      invoice: 'Extract invoice details: invoice number, date, vendor, total amount, line items, due date.',
      contract: 'Analyze this contract: parties involved, key terms, dates, obligations, and important clauses.',
      receipt: 'Extract receipt information: merchant, date, items purchased, amounts, total, payment method.',
      businessCard: 'Extract business card information: name, title, company, email, phone, address.',
    };

    return this.analyzeImage(imagePath, prompts[documentType] || prompts.general, {
      temperature: 0.1,
      maxTokens: 2048,
    });
  }

  /**
   * Compare two images
   */
  async compareImages(imagePath1, imagePath2, question) {
    const spinner = ora('Loading vision model...').start();

    try {
      // Validate both file paths
      const validatedPath1 = validateFilePath(imagePath1);
      const validatedPath2 = validateFilePath(imagePath2);

      const model = await this.client.llm.get({
        identifier: this.visionModels[0],
      });

      spinner.text = 'Reading images...';

      const [image1Buffer, image2Buffer] = await Promise.all([
        fs.readFile(validatedPath1),
        fs.readFile(validatedPath2),
      ]);

      const image1Base64 = image1Buffer.toString('base64');
      const image2Base64 = image2Buffer.toString('base64');

      const mimeType1 = this.getMimeType(validatedPath1);
      const mimeType2 = this.getMimeType(validatedPath2);

      spinner.text = 'Comparing images...';

      const response = await model.respond([
        {
          type: 'text',
          text: question || 'Compare these two images and describe the differences.',
        },
        {
          type: 'image',
          image: { data: image1Base64, mimeType: mimeType1 },
        },
        {
          type: 'image',
          image: { data: image2Base64, mimeType: mimeType2 },
        },
      ]);

      spinner.succeed('Images compared');

      return {
        success: true,
        comparison: response.content,
      };
    } catch (error) {
      spinner.fail('Image comparison failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

// ============================================================
// CRM-SPECIFIC VISION TASKS
// ============================================================

export class CRMVisionAnalyzer {
  constructor() {
    this.vision = new VisionClient();
  }

  /**
   * Analyze product image for catalog
   */
  async analyzeProductImage(imagePath) {
    return this.vision.analyzeImage(
      imagePath,
      `Analyze this product image and provide:
1. Product description
2. Key features visible
3. Color and style
4. Condition assessment
5. Suggested category
6. Estimated quality rating (1-10)`,
      { temperature: 0.2, maxTokens: 1024 }
    );
  }

  /**
   * Analyze contact profile photo
   */
  async analyzeProfilePhoto(imagePath) {
    return this.vision.analyzeImage(
      imagePath,
      'Describe this person professionally for a CRM profile. Note: professional appearance, setting, and any visible business context.',
      { temperature: 0.1, maxTokens: 512 }
    );
  }

  /**
   * Analyze business card
   */
  async scanBusinessCard(imagePath) {
    return this.vision.analyzeDocument(imagePath, 'businessCard');
  }

  /**
   * Analyze signed contract
   */
  async verifySignedContract(imagePath) {
    return this.vision.analyzeImage(
      imagePath,
      `Verify this signed document:
1. Check for signatures
2. Identify signing parties
3. Note date signed
4. Confirm all required fields are filled
5. Flag any missing information`,
      { temperature: 0.1, maxTokens: 1024 }
    );
  }

  /**
   * Analyze invoice or receipt
   */
  async processInvoice(imagePath) {
    return this.vision.analyzeDocument(imagePath, 'invoice');
  }

  /**
   * Analyze meeting whiteboard photo
   */
  async analyzeMeetingWhiteboard(imagePath) {
    return this.vision.analyzeImage(
      imagePath,
      `Analyze this meeting whiteboard photo:
1. Extract all visible text and notes
2. Identify action items
3. List decisions made
4. Note any diagrams or flowcharts
5. Summarize key takeaways`,
      { temperature: 0.2, maxTokens: 2048 }
    );
  }

  /**
   * Analyze office/facility photo for site visit reports
   */
  async analyzeSiteVisit(imagePath) {
    return this.vision.analyzeImage(
      imagePath,
      `Analyze this facility/office photo for a site visit report:
1. Describe the location and setting
2. Note equipment and infrastructure visible
3. Assess overall condition
4. Identify any concerns or noteworthy features
5. Professional quality assessment`,
      { temperature: 0.2, maxTokens: 1024 }
    );
  }
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const task = process.argv[2] || 'help';
  const imagePath = process.argv[3];

  const crmVision = new CRMVisionAnalyzer();

  (async () => {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║  ClientForge Vision & Multimodal AI   ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));

    if (task === 'help' || !imagePath) {
      console.log(chalk.yellow('Usage:'));
      console.log(chalk.white('  node src/vision-multimodal.js <task> <image-path>\n'));
      console.log(chalk.yellow('Available tasks:'));
      console.log(chalk.white('  analyze <image>        - General image analysis'));
      console.log(chalk.white('  ocr <image>            - Extract text (OCR)'));
      console.log(chalk.white('  product <image>        - Analyze product image'));
      console.log(chalk.white('  business-card <image>  - Scan business card'));
      console.log(chalk.white('  invoice <image>        - Process invoice/receipt'));
      console.log(chalk.white('  contract <image>       - Verify signed contract'));
      console.log(chalk.white('  whiteboard <image>     - Analyze meeting whiteboard'));
      console.log(chalk.white('  site-visit <image>     - Analyze facility photo\n'));
      return;
    }

    let result;

    switch (task) {
      case 'analyze':
        result = await crmVision.vision.analyzeImage(imagePath);
        break;
      case 'ocr':
        result = await crmVision.vision.extractText(imagePath);
        break;
      case 'product':
        result = await crmVision.analyzeProductImage(imagePath);
        break;
      case 'business-card':
        result = await crmVision.scanBusinessCard(imagePath);
        break;
      case 'invoice':
        result = await crmVision.processInvoice(imagePath);
        break;
      case 'contract':
        result = await crmVision.verifySignedContract(imagePath);
        break;
      case 'whiteboard':
        result = await crmVision.analyzeMeetingWhiteboard(imagePath);
        break;
      case 'site-visit':
        result = await crmVision.analyzeSiteVisit(imagePath);
        break;
      default:
        console.log(chalk.red(`Unknown task: ${task}`));
        console.log(chalk.yellow('Run with "help" to see available tasks'));
        return;
    }

    if (result.success) {
      console.log(chalk.green('\n✓ Analysis Complete\n'));
      console.log(chalk.bold('Result:'));
      console.log(result.analysis);
    } else {
      console.log(chalk.red('\n✗ Analysis Failed\n'));
      console.log(chalk.red('Error:'), result.error);
    }
  })();
}
