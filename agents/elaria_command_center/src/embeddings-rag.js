/**
 * LM Studio Embeddings & RAG Integration
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\embeddings-rag.js
 * Purpose: Document embeddings, vector search, RAG for ClientForge CRM with Chroma persistence
 * Models: nomic-embed-text-v1.5, text-embedding-*
 * Updated: 2025-11-07 - Added Chroma for persistent vector storage
 */

import { LMStudioClient } from '@lmstudio/sdk';
import { ChromaClient } from 'chromadb';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

// ============================================================
// EMBEDDINGS CLIENT
// ============================================================

export class EmbeddingsClient {
  constructor(baseUrl = 'ws://localhost:1234', chromaPath = './chroma_data') {
    this.client = new LMStudioClient({ baseUrl });
    this.embeddingModel = 'text-embedding-nomic-embed-text-v1.5';
    this.chromaClient = null;
    this.collection = null;
    this.chromaPath = chromaPath;
    this.isInitialized = false;
  }

  /**
   * Initialize Chroma client and collection
   */
  async initialize(collectionName = 'elaria_embeddings') {
    if (this.isInitialized) return;

    try {
      this.chromaClient = new ChromaClient({ path: this.chromaPath });

      // Try to get existing collection or create new one
      try {
        this.collection = await this.chromaClient.getCollection({
          name: collectionName
        });
      } catch (error) {
        this.collection = await this.chromaClient.createCollection({
          name: collectionName,
          metadata: {
            'hnsw:space': 'cosine',
            description: 'Elaria Command Center vector embeddings',
            created: new Date().toISOString()
          }
        });
      }

      this.isInitialized = true;
      return { success: true, collectionName, path: this.chromaPath };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize Chroma: ${error.message}`
      };
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text, options = {}) {
    try {
      const model = await this.client.llm.get({
        identifier: options.model || this.embeddingModel,
      });

      const embedding = await model.embed(text);

      return {
        success: true,
        embedding: embedding.data,
        dimensions: embedding.data.length,
        text: text.substring(0, 100) + '...',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts, options = {}) {
    const spinner = ora(`Generating embeddings for ${texts.length} texts...`).start();

    try {
      const embeddings = await Promise.all(
        texts.map((text) => this.generateEmbedding(text, options))
      );

      spinner.succeed(`Generated ${embeddings.length} embeddings`);

      return {
        success: true,
        embeddings,
        count: embeddings.length,
      };
    } catch (error) {
      spinner.fail('Embedding generation failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Store document with embedding in Chroma
   */
  async storeDocument(id, text, metadata = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const embeddingResult = await this.generateEmbedding(text);

    if (!embeddingResult.success) {
      return embeddingResult;
    }

    try {
      await this.collection.add({
        ids: [id],
        embeddings: [embeddingResult.embedding],
        documents: [text],
        metadatas: [{
          ...metadata,
          createdAt: new Date().toISOString()
        }]
      });

      return {
        success: true,
        id,
        message: 'Document stored successfully in Chroma',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to store document: ${error.message}`
      };
    }
  }

  /**
   * Search documents by semantic similarity using Chroma
   */
  async searchDocuments(query, topK = 5) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const spinner = ora('Searching documents...').start();

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding.success) {
        throw new Error(queryEmbedding.error);
      }

      // Query Chroma with the embedding
      const chromaResults = await this.collection.query({
        queryEmbeddings: [queryEmbedding.embedding],
        nResults: topK
      });

      // Transform Chroma results to our format
      const results = [];
      if (chromaResults.ids && chromaResults.ids[0]) {
        for (let i = 0; i < chromaResults.ids[0].length; i++) {
          results.push({
            id: chromaResults.ids[0][i],
            text: chromaResults.documents[0][i],
            metadata: chromaResults.metadatas[0][i],
            similarity: 1 - chromaResults.distances[0][i], // Convert distance to similarity
          });
        }
      }

      spinner.succeed(`Found ${results.length} relevant documents from Chroma`);

      return {
        success: true,
        query,
        results,
        totalSearched: await this.collection.count(),
      };
    } catch (error) {
      spinner.fail('Search failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear vector store (delete collection)
   */
  async clearStore() {
    if (!this.isInitialized) {
      return { success: true, message: 'Store not initialized, nothing to clear' };
    }

    try {
      const collectionName = this.collection.name;
      await this.chromaClient.deleteCollection({ name: collectionName });
      this.collection = null;
      this.isInitialized = false;
      return { success: true, message: 'Chroma collection deleted' };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear store: ${error.message}`
      };
    }
  }

  /**
   * Get store stats
   */
  async getStats() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const count = await this.collection.count();
      return {
        documentsStored: count,
        embeddingModel: this.embeddingModel,
        chromaPath: this.chromaPath,
        collectionName: this.collection.name,
        persistent: true
      };
    } catch (error) {
      return {
        documentsStored: 0,
        embeddingModel: this.embeddingModel,
        error: error.message
      };
    }
  }
}

// ============================================================
// RAG (Retrieval-Augmented Generation)
// ============================================================

export class RAGClient {
  constructor(baseUrl = 'ws://localhost:1234', chromaPath = './chroma_data') {
    this.embeddings = new EmbeddingsClient(baseUrl, chromaPath);
    this.client = new LMStudioClient({ baseUrl });
    this.llmModel = 'qwen3-30b-a3b';
  }

  /**
   * Load documents into vector store
   */
  async loadDocuments(documents) {
    const spinner = ora(`Loading ${documents.length} documents...`).start();

    try {
      for (const doc of documents) {
        await this.embeddings.storeDocument(doc.id, doc.text, doc.metadata || {});
      }

      spinner.succeed(`Loaded ${documents.length} documents`);

      return {
        success: true,
        count: documents.length,
      };
    } catch (error) {
      spinner.fail('Document loading failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Load documents from directory
   */
  async loadFromDirectory(directoryPath, options = {}) {
    const spinner = ora('Scanning directory...').start();

    try {
      const files = await fs.readdir(directoryPath);
      const textFiles = files.filter((f) =>
        ['.txt', '.md', '.json'].includes(path.extname(f))
      );

      spinner.text = `Loading ${textFiles.length} files...`;

      const documents = [];
      for (const file of textFiles) {
        const filePath = path.join(directoryPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        documents.push({
          id: file,
          text: content,
          metadata: {
            filename: file,
            path: filePath,
            size: content.length,
          },
        });
      }

      await this.loadDocuments(documents);

      spinner.succeed(`Loaded ${textFiles.length} files`);

      return {
        success: true,
        filesLoaded: textFiles.length,
      };
    } catch (error) {
      spinner.fail('Directory loading failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Query with RAG - Retrieval + Generation
   */
  async query(question, options = {}) {
    const spinner = ora('Retrieving relevant documents...').start();

    try {
      // 1. Retrieve relevant documents
      const searchResults = await this.embeddings.searchDocuments(
        question,
        options.topK || 3
      );

      if (!searchResults.success) {
        throw new Error(searchResults.error);
      }

      spinner.text = 'Generating response...';

      // 2. Build context from retrieved documents
      const context = searchResults.results
        .map((doc, i) => `[Document ${i + 1}] ${doc.text}`)
        .join('\n\n');

      // 3. Generate response with context
      const model = await this.client.llm.get({
        identifier: options.model || this.llmModel,
      });

      const prompt = `You are a helpful assistant. Use the following context to answer the question. If the context doesn't contain relevant information, say so.

Context:
${context}

Question: ${question}

Answer:`;

      const response = await model.respond(prompt, {
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 1024,
      });

      spinner.succeed('Response generated');

      return {
        success: true,
        question,
        answer: response.content,
        sourcesUsed: searchResults.results.map((doc) => ({
          id: doc.id,
          similarity: doc.similarity.toFixed(3),
          preview: doc.text.substring(0, 100) + '...',
        })),
      };
    } catch (error) {
      spinner.fail('RAG query failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Chat with documents (conversational RAG)
   */
  async chat(messages, options = {}) {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role !== 'user') {
      return {
        success: false,
        error: 'Last message must be from user',
      };
    }

    return this.query(lastMessage.content, options);
  }
}

// ============================================================
// CRM-SPECIFIC RAG APPLICATIONS
// ============================================================

export class CRMKnowledgeBase {
  constructor(chromaPath = './chroma_data') {
    this.rag = new RAGClient('ws://localhost:1234', chromaPath);
  }

  /**
   * Load CRM knowledge base
   */
  async initialize() {
    console.log(chalk.cyan('Initializing CRM Knowledge Base with Chroma...'));

    // Initialize Chroma first
    await this.rag.embeddings.initialize('crm_knowledge_base');

    const contextPackPath = 'D:/clientforge-crm/05_SHARED_AI/context_pack';

    if (existsSync(contextPackPath)) {
      await this.rag.loadFromDirectory(contextPackPath);
    } else {
      console.log(chalk.yellow('⚠ Context pack not found, using empty knowledge base'));
    }

    const stats = await this.rag.embeddings.getStats();
    console.log(chalk.green(`✓ Knowledge base initialized with ${stats.documentsStored} documents (persistent)`));
  }

  /**
   * Query CRM policies and procedures
   */
  async queryPolicy(question) {
    console.log(chalk.yellow(`\nPolicy Query: ${question}`));

    const result = await this.rag.query(question, {
      topK: 3,
      temperature: 0.2,
    });

    if (result.success) {
      console.log(chalk.green('\n✓ Answer:'));
      console.log(result.answer);
      console.log(chalk.gray('\nSources:'));
      result.sourcesUsed.forEach((src) => {
        console.log(chalk.gray(`  - ${src.id} (similarity: ${src.similarity})`));
      });
    }

    return result;
  }

  /**
   * Search product documentation
   */
  async searchProductDocs(query) {
    return this.rag.query(`Search product documentation: ${query}`, {
      topK: 5,
      temperature: 0.1,
    });
  }

  /**
   * Find similar support tickets
   */
  async findSimilarTickets(ticketDescription) {
    return this.rag.embeddings.searchDocuments(ticketDescription, 10);
  }

  /**
   * Generate response from knowledge base
   */
  async generateKBResponse(question) {
    return this.rag.query(question, {
      topK: 5,
      temperature: 0.3,
      maxTokens: 2048,
    });
  }
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const task = process.argv[2] || 'help';

  (async () => {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║  ClientForge Embeddings & RAG          ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));

    const kb = new CRMKnowledgeBase();

    switch (task) {
      case 'init':
        await kb.initialize();
        break;

      case 'query':
        await kb.initialize();
        const question = process.argv.slice(3).join(' ') || 'What is ClientForge CRM?';
        await kb.queryPolicy(question);
        break;

      case 'test':
        console.log(chalk.yellow('Testing embeddings...'));

        const embedClient = new EmbeddingsClient();

        // Store test documents
        await embedClient.storeDocument('doc1', 'ClientForge is a CRM system for managing customers.', { type: 'general' });
        await embedClient.storeDocument('doc2', 'The contact module allows you to track leads and customers.', { type: 'feature' });
        await embedClient.storeDocument('doc3', 'Deal management helps forecast revenue and track pipeline.', { type: 'feature' });

        // Search
        const results = await embedClient.searchDocuments('How do I manage customers?', 2);

        console.log(chalk.green('\n✓ Search Results:'));
        results.results.forEach((doc, i) => {
          console.log(chalk.white(`\n${i + 1}. Similarity: ${doc.similarity.toFixed(3)}`));
          console.log(chalk.gray(`   ${doc.text}`));
        });
        break;

      case 'help':
      default:
        console.log(chalk.yellow('Usage:'));
        console.log(chalk.white('  node src/embeddings-rag.js <task> [args]\n'));
        console.log(chalk.yellow('Available tasks:'));
        console.log(chalk.white('  init               - Initialize knowledge base'));
        console.log(chalk.white('  query <question>   - Query knowledge base'));
        console.log(chalk.white('  test               - Test embeddings with sample docs'));
        console.log(chalk.white('  help               - Show this help\n'));
        break;
    }
  })();
}
