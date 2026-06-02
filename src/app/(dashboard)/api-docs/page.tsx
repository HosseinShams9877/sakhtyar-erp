'use client';

import React, { useSyncExternalStore } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const emptySubscribe = () => () => {};

export default function ApiDocsPage() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری مستندات API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="api-docs-wrapper" dir="ltr">
      <style jsx global>{`
        /* ─── RTL & Custom Styling for Swagger UI ─── */
        .api-docs-wrapper .swagger-ui {
          font-family: var(--font-vazirmatn), 'Vazirmatn', sans-serif;
        }

        /* Top bar */
        .api-docs-wrapper .swagger-ui .topbar {
          display: none;
        }

        /* Info section */
        .api-docs-wrapper .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }

        .api-docs-wrapper .swagger-ui .info .base-url {
          display: none;
        }

        /* Scheme container */
        .api-docs-wrapper .swagger-ui .scheme-container {
          background: hsl(var(--card));
          border-bottom: 1px solid hsl(var(--border));
          box-shadow: none;
        }

        .api-docs-wrapper .swagger-ui .scheme-container .schemes {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        /* Operations */
        .api-docs-wrapper .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.1);
        }

        .api-docs-wrapper .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.1);
        }

        .api-docs-wrapper .swagger-ui .opblock.opblock-put {
          border-color: #fca130;
          background: rgba(252, 161, 48, 0.1);
        }

        .api-docs-wrapper .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
          background: rgba(249, 62, 62, 0.1);
        }

        /* Method badges */
        .api-docs-wrapper .swagger-ui .opblock .opblock-summary-method {
          font-family: var(--font-vazirmatn), monospace;
          font-weight: 700;
          min-width: 80px;
          text-align: center;
        }

        /* Dark mode support */
        .dark .api-docs-wrapper .swagger-ui {
          filter: invert(88%) hue-rotate(180deg);
        }

        .dark .api-docs-wrapper .swagger-ui img,
        .dark .api-docs-wrapper .swagger-ui video,
        .dark .api-docs-wrapper .swagger-ui .microlight {
          filter: invert(100%) hue-rotate(180deg);
        }

        /* Dark mode fix for scheme container */
        .dark .api-docs-wrapper .swagger-ui .scheme-container {
          background: #1e1e1e;
        }

        /* Fix scrollbar in dark mode */
        .dark .api-docs-wrapper .swagger-ui .highlight-code .microlight {
          filter: invert(100%) hue-rotate(180deg);
        }

        /* Page layout */
        .api-docs-wrapper .swagger-ui .wrapper {
          max-width: 1400px;
          padding: 0 20px;
        }

        /* Model sections */
        .api-docs-wrapper .swagger-ui section.models {
          border-top: 2px solid hsl(var(--border));
        }

        .api-docs-wrapper .swagger-ui .model-box {
          background: hsl(var(--card));
        }

        /* Response sections */
        .api-docs-wrapper .swagger-ui .responses-inner {
          padding: 10px 0;
        }

        /* Try-it-out button */
        .api-docs-wrapper .swagger-ui .btn.try-out__btn {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border: none;
          border-radius: 4px;
          padding: 6px 16px;
          cursor: pointer;
        }

        .api-docs-wrapper .swagger-ui .btn.try-out__btn:hover {
          opacity: 0.9;
        }

        /* Execute button */
        .api-docs-wrapper .swagger-ui .btn.execute {
          background: #49cc90;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 8px 24px;
          font-weight: 700;
        }

        /* Parameters */
        .api-docs-wrapper .swagger-ui table thead tr th,
        .api-docs-wrapper .swagger-ui table thead tr td {
          border-bottom: 2px solid hsl(var(--border));
          font-weight: 700;
        }

        .api-docs-wrapper .swagger-ui .parameters-col_description {
          direction: rtl;
          text-align: right;
        }

        .api-docs-wrapper .swagger-ui .parameters-col_description input {
          direction: ltr;
          text-align: left;
        }

        /* Description text RTL */
        .api-docs-wrapper .swagger-ui .opblock-body pre {
          direction: ltr;
          text-align: left;
        }

        .api-docs-wrapper .swagger-ui .opblock-description-wrapper,
        .api-docs-wrapper .swagger-ui .opblock-external-docs-wrapper,
        .api-docs-wrapper .swagger-ui .opblock-title_normal {
          direction: rtl;
        }

        .api-docs-wrapper .swagger-ui .opblock-description-wrapper p,
        .api-docs-wrapper .swagger-ui .opblock-title_normal p {
          direction: rtl;
          text-align: right;
        }

        /* Info description RTL */
        .api-docs-wrapper .swagger-ui .info .description p {
          direction: rtl;
          text-align: right;
        }

        .api-docs-wrapper .swagger-ui .info .description h2,
        .api-docs-wrapper .swagger-ui .info .description h3 {
          direction: rtl;
          text-align: right;
        }

        .api-docs-wrapper .swagger-ui .info .description ul,
        .api-docs-wrapper .swagger-ui .info .description li {
          direction: rtl;
          text-align: right;
        }

        /* Tag descriptions */
        .api-docs-wrapper .swagger-ui .opblock-tag {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .api-docs-wrapper .swagger-ui .opblock-tag no-animations {
          direction: rtl;
        }

        /* Filter container */
        .api-docs-wrapper .swagger-ui .filter-container {
          margin: 10px 0;
        }

        .api-docs-wrapper .swagger-ui .filter-container .operation-filter-input {
          border: 1px solid hsl(var(--border));
          border-radius: 4px;
          padding: 8px 12px;
          width: 100%;
        }

        /* Page header */
        .api-docs-page-header {
          direction: rtl;
          text-align: right;
          padding: 24px 32px 16px;
          background: hsl(var(--card));
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: 0;
        }

        .api-docs-page-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          color: hsl(var(--foreground));
        }

        .api-docs-page-header p {
          margin-top: 4px;
          color: hsl(var(--muted-foreground));
          font-size: 0.9rem;
        }

        .api-docs-page-header .api-badge {
          display: inline-block;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 8px;
          vertical-align: middle;
        }
      `}</style>

      <div className="api-docs-page-header">
        <h1>
          <span className="api-badge">نسخه ۱.۰</span>
          مستندات API
        </h1>
        <p>مستندات جامع API سامانه مدیریت مصالح عمرانی - تمام Endpoint‌ها، مدل‌ها و سطح دسترسی‌ها</p>
      </div>

      <SwaggerUI
        url="/api/docs"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={2}
        displayRequestDuration={true}
        filter={true}
        persistAuthorization={true}
        tryItOutEnabled={false}
        displayOperationId={false}
        showExtensions={true}
        showCommonExtensions={true}
        requestInterceptor={(request: any) => {
          // Include cookies for cross-origin requests
          request.credentials = 'same-origin';
          return request;
        }}
      />
    </div>
  );
}
