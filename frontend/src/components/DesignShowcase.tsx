/**
 * Design System Showcase
 * Beautiful, elegant, and desirable component demonstrations
 */

import React from 'react'

export default function DesignShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-alabaster-100 via-alabaster-200 to-alabaster-300 dark:from-dark-primary dark:via-dark-secondary dark:to-dark-tertiary p-8">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <header className="text-center space-y-4 animate-fade-in-down">
          <h1 className="text-6xl font-syne font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600">
            ClientForge Design System
          </h1>
          <p className="text-xl text-charcoal-600 dark:text-charcoal-300 font-syne-mono">
            Beautiful, Elegant, Desirable
          </p>
        </header>

        {/* Button Showcase */}
        <section className="glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-3xl font-syne font-bold mb-6 text-charcoal-900 dark:text-charcoal-50">
            Buttons with Gradients
          </h2>
          <div className="flex flex-wrap gap-4">
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-secondary">Secondary Button</button>
            <button className="btn btn-success">Success Button</button>
            <button className="btn btn-warning">Warning Button</button>
            <button className="btn btn-danger">Danger Button</button>
            <button className="btn btn-ghost">Ghost Button</button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <button className="btn btn-primary btn-lg">Large Button</button>
            <button className="btn btn-primary">Default Size</button>
            <button className="btn btn-primary btn-sm">Small Button</button>
            <button className="btn btn-primary btn-icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </section>

        {/* Card Showcase */}
        <section className="space-y-6">
          <h2 className="text-3xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 animate-fade-in">
            Glass Morphism Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">
                  Total Revenue
                </h3>
                <div className="p-3 rounded-full bg-gradient-to-br from-success-500 to-success-600 shadow-glow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
                $45,231.89
              </p>
              <p className="text-sm text-success-600 dark:text-success-400 font-syne-mono">
                +20.1% from last month
              </p>
            </div>

            <div className="glass-card-hover animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">
                  Active Users
                </h3>
                <div className="p-3 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
                2,350
              </p>
              <p className="text-sm text-primary-600 dark:text-primary-400 font-syne-mono">
                +12.5% from last month
              </p>
            </div>

            <div className="glass-card-hover animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">
                  Conversion Rate
                </h3>
                <div className="p-3 rounded-full bg-gradient-to-br from-warning-500 to-warning-600 shadow-glow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
                3.24%
              </p>
              <p className="text-sm text-warning-600 dark:text-warning-400 font-syne-mono">
                +4.8% from last month
              </p>
            </div>
          </div>
        </section>

        {/* Badge Showcase */}
        <section className="glass-card animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <h2 className="text-3xl font-syne font-bold mb-6 text-charcoal-900 dark:text-charcoal-50">
            Status Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="badge badge-success">Success</span>
            <span className="badge badge-warning">Warning</span>
            <span className="badge badge-danger">Danger</span>
            <span className="badge badge-info">Info</span>
            <span className="badge badge-primary">Primary</span>
          </div>
        </section>

        {/* Form Components */}
        <section className="glass-card animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <h2 className="text-3xl font-syne font-bold mb-6 text-charcoal-900 dark:text-charcoal-50">
            Form Elements
          </h2>
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="Enter your message here..."
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-charcoal-700 dark:text-charcoal-300 font-syne-mono">
                I agree to the terms and conditions
              </label>
            </div>
          </div>
        </section>

        {/* Animation Examples */}
        <section className="glass-card">
          <h2 className="text-3xl font-syne font-bold mb-6 text-charcoal-900 dark:text-charcoal-50">
            Animations & Effects
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl text-white text-center animate-float">
              <p className="font-syne-mono">Float</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-success-500 to-success-600 rounded-xl text-white text-center animate-pulse-subtle">
              <p className="font-syne-mono">Pulse</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl text-white text-center animate-bounce-subtle">
              <p className="font-syne-mono">Bounce</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-danger-500 to-danger-600 rounded-xl text-white text-center animate-glow">
              <p className="font-syne-mono">Glow</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
