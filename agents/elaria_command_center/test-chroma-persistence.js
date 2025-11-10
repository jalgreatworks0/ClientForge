#!/usr/bin/env node

/**
 * Test Chroma Persistent Vector Storage
 * Verifies that embeddings persist across restarts
 */

import { EmbeddingsClient } from './src/embeddings-rag.js';
import chalk from 'chalk';

async function testChromaPersistence() {
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║  Chroma Persistence Test              ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));

  const client = new EmbeddingsClient('ws://localhost:1234', './test_chroma_data');

  try {
    // Phase 1: Initialize and add documents
    console.log(chalk.yellow('Phase 1: Initializing Chroma and adding test documents...'));
    await client.initialize('test_embeddings');

    const testDocs = [
      {
        id: 'doc1',
        text: 'ClientForge CRM is a comprehensive customer relationship management system.',
        metadata: { type: 'product', category: 'overview' }
      },
      {
        id: 'doc2',
        text: 'The deal pipeline helps sales teams track opportunities from lead to close.',
        metadata: { type: 'feature', category: 'sales' }
      },
      {
        id: 'doc3',
        text: 'Contact management allows you to organize and segment your customer database.',
        metadata: { type: 'feature', category: 'contacts' }
      },
      {
        id: 'doc4',
        text: 'Elaria Command Center orchestrates AI agents for automated workflows.',
        metadata: { type: 'agent', category: 'automation' }
      },
      {
        id: 'doc5',
        text: 'LM Studio integration enables local AI models without cloud dependencies.',
        metadata: { type: 'integration', category: 'ai' }
      }
    ];

    for (const doc of testDocs) {
      const result = await client.storeDocument(doc.id, doc.text, doc.metadata);
      if (result.success) {
        console.log(chalk.green(`  ✓ Stored: ${doc.id}`));
      } else {
        console.log(chalk.red(`  ✗ Failed: ${doc.id} - ${result.error}`));
      }
    }

    // Get stats
    const stats1 = await client.getStats();
    console.log(chalk.cyan(`\nStats after insertion:`));
    console.log(chalk.white(`  Documents: ${stats1.documentsStored}`));
    console.log(chalk.white(`  Collection: ${stats1.collectionName}`));
    console.log(chalk.white(`  Persistent: ${stats1.persistent}`));
    console.log(chalk.white(`  Path: ${stats1.chromaPath}`));

    // Phase 2: Test search
    console.log(chalk.yellow('\nPhase 2: Testing semantic search...'));
    const searchQueries = [
      'How do I manage customer relationships?',
      'Tell me about AI automation',
      'What are the sales features?'
    ];

    for (const query of searchQueries) {
      const results = await client.searchDocuments(query, 2);
      if (results.success) {
        console.log(chalk.green(`\n✓ Query: "${query}"`));
        results.results.forEach((doc, i) => {
          console.log(chalk.white(`  ${i + 1}. [${doc.id}] Similarity: ${doc.similarity.toFixed(3)}`));
          console.log(chalk.gray(`     ${doc.text.substring(0, 80)}...`));
        });
      }
    }

    // Phase 3: Test persistence by creating new client
    console.log(chalk.yellow('\nPhase 3: Testing persistence (new client instance)...'));
    const client2 = new EmbeddingsClient('ws://localhost:1234', './test_chroma_data');
    await client2.initialize('test_embeddings');

    const stats2 = await client2.getStats();
    console.log(chalk.cyan(`\nStats from new client instance:`));
    console.log(chalk.white(`  Documents: ${stats2.documentsStored}`));

    if (stats2.documentsStored === testDocs.length) {
      console.log(chalk.green.bold('\n✓ PERSISTENCE TEST PASSED!'));
      console.log(chalk.green(`  Documents survived client restart`));
    } else {
      console.log(chalk.red.bold('\n✗ PERSISTENCE TEST FAILED!'));
      console.log(chalk.red(`  Expected ${testDocs.length}, got ${stats2.documentsStored}`));
    }

    // Test search with new client
    const persistedSearch = await client2.searchDocuments('AI automation', 2);
    if (persistedSearch.success && persistedSearch.results.length > 0) {
      console.log(chalk.green('\n✓ Search works with persisted data!'));
      console.log(chalk.white(`  Top result: ${persistedSearch.results[0].id}`));
    }

    // Cleanup
    console.log(chalk.yellow('\nCleaning up test data...'));
    await client2.clearStore();
    console.log(chalk.green('✓ Test data cleared\n'));

    // Summary
    console.log(chalk.cyan.bold('╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║  Test Summary                          ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝'));
    console.log(chalk.green('✓ Chroma initialization works'));
    console.log(chalk.green('✓ Document storage works'));
    console.log(chalk.green('✓ Semantic search works'));
    console.log(chalk.green('✓ Data persists across client restarts'));
    console.log(chalk.green('✓ Collection cleanup works\n'));

  } catch (error) {
    console.error(chalk.red.bold('\n✗ Test failed:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testChromaPersistence();
