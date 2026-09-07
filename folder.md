```
AUTOMATIONS
├──apps
│   ├──backend
│   │   ├──src
│   │   │   ├──config
│   │   │   │   ├──constants.ts
│   │   │   │   ├──database.ts
│   │   │   │   ├──env.ts
│   │   │   │   ├──index.ts
│   │   │   │   └──logger.ts
│   │   │   ├──docs
│   │   │   │   └──swagger.ts
│   │   │   ├──infrastructure
│   │   │   │   ├──database
│   │   │   │   │   └──index.ts
│   │   │   │   ├──email
│   │   │   │   │   └──index.ts
│   │   │   │   ├──queue
│   │   │   │   │   └──index.ts
│   │   │   │   ├──rate-limiter
│   │   │   │   │   └──index.ts
│   │   │   │   ├──redis
│   │   │   │   │   └──index.ts
│   │   │   │   └──storage
│   │   │   │   │   └──index.ts
│   │   │   ├──jobs
│   │   │   │   ├──memory-extraction.job.ts
│   │   │   │   ├──notification.job.ts
│   │   │   │   ├──oauth-refresh.job.ts
│   │   │   │   ├──polling-scheduler.job.ts
│   │   │   │   ├──telegram-polling.job.ts
│   │   │   │   ├──webhook-renewal.job.ts
│   │   │   │   └──workflow-execution.job.ts
│   │   │   ├──middleware
│   │   │   │   ├──auth.middleware.ts
│   │   │   │   ├──error.middleware.ts
│   │   │   │   ├──rate-limit.middleware.ts
│   │   │   │   └──validation.middleware.ts
│   │   │   ├──modules
│   │   │   │   ├──ai-agent
│   │   │   │   │   ├──ai-agent.controller.ts
│   │   │   │   │   ├──ai-agent.io-mapper.ts
│   │   │   │   │   ├──ai-agent.model.ts
│   │   │   │   │   ├──ai-agent.repository.ts
│   │   │   │   │   ├──ai-agent.routes.ts
│   │   │   │   │   ├──ai-agent.service.ts
│   │   │   │   │   ├──ai-agent.types.ts
│   │   │   │   │   ├──ai-agent.validation.ts
│   │   │   │   │   └──ai-agent.workflow-validator.ts
│   │   │   │   ├──auth
│   │   │   │   │   ├──auth.controller.ts
│   │   │   │   │   ├──auth.model.ts
│   │   │   │   │   ├──auth.repository.ts
│   │   │   │   │   ├──auth.routes.ts
│   │   │   │   │   ├──auth.service.ts
│   │   │   │   │   ├──auth.types.ts
│   │   │   │   │   └──auth.validation.ts
│   │   │   │   ├──billing
│   │   │   │   │   ├──billing.controller.ts
│   │   │   │   │   ├──billing.routes.ts
│   │   │   │   │   └──billing.service.ts
│   │   │   │   ├──connectors
│   │   │   │   │   ├──connector-choices.controller.ts
│   │   │   │   │   ├──connector-registry.controller.ts
│   │   │   │   │   ├──connector.controller.ts
│   │   │   │   │   ├──connector.model.ts
│   │   │   │   │   ├──connector.repository.ts
│   │   │   │   │   ├──connector.routes.ts
│   │   │   │   │   ├──connector.service.ts
│   │   │   │   │   ├──connector.types.ts
│   │   │   │   │   └──connector.validation.ts
│   │   │   │   ├──dashboard
│   │   │   │   │   └──dashboard.routes.ts
│   │   │   │   ├──executions
│   │   │   │   │   ├──execution.controller.ts
│   │   │   │   │   ├──execution.model.ts
│   │   │   │   │   ├──execution.repository.ts
│   │   │   │   │   ├──execution.routes.ts
│   │   │   │   │   ├──execution.service.ts
│   │   │   │   │   ├──execution.types.ts
│   │   │   │   │   └──execution.validation.ts
│   │   │   │   ├──users
│   │   │   │   │   ├──user.controller.ts
│   │   │   │   │   ├──user.model.ts
│   │   │   │   │   ├──user.repository.ts
│   │   │   │   │   ├──user.routes.ts
│   │   │   │   │   ├──user.service.ts
│   │   │   │   │   ├──user.types.ts
│   │   │   │   │   └──user.validation.ts
│   │   │   │   ├──webhooks
│   │   │   │   │   ├──telegram-webhook.controller.ts
│   │   │   │   │   ├──webhook-gateway.controller.ts
│   │   │   │   │   └──webhook-gateway.routes.ts
│   │   │   │   ├──whatsapp-agent
│   │   │   │   │   ├──agent-runtime.service.ts
│   │   │   │   │   ├──conversation.service.ts
│   │   │   │   │   ├──memory-extraction.service.ts
│   │   │   │   │   ├──user-memory.service.ts
│   │   │   │   │   ├──webhook.handler.ts
│   │   │   │   │   ├──whatsapp-agent.controller.ts
│   │   │   │   │   ├──whatsapp-agent.routes.ts
│   │   │   │   │   ├──whatsapp-agent.types.ts
│   │   │   │   │   ├──whatsapp-automation.service.ts
│   │   │   │   │   └──whatsapp-simulator.controller.ts
│   │   │   │   └──workflows
│   │   │   │   │   ├──workflow-test.controller.ts
│   │   │   │   │   ├──workflow.controller.ts
│   │   │   │   │   ├──workflow.model.ts
│   │   │   │   │   ├──workflow.repository.ts
│   │   │   │   │   ├──workflow.routes.ts
│   │   │   │   │   ├──workflow.service.ts
│   │   │   │   │   ├──workflow.types.ts
│   │   │   │   │   └──workflow.validation.ts
│   │   │   ├──services
│   │   │   │   ├──socket.service.ts
│   │   │   │   └──workflow-scheduler.service.ts
│   │   │   ├──shared
│   │   │   │   ├──constants
│   │   │   │   │   └──index.ts
│   │   │   │   ├──errors
│   │   │   │   │   ├──app.error.ts
│   │   │   │   │   └──error.codes.ts
│   │   │   │   ├──types
│   │   │   │   │   └──common.types.ts
│   │   │   │   └──utils
│   │   │   │   │   ├──crypto.ts
│   │   │   │   │   ├──date.ts
│   │   │   │   │   ├──pagination.ts
│   │   │   │   │   └──response.ts
│   │   │   ├──app.ts
│   │   │   └──server.ts
│   │   ├──Dockerfile
│   │   ├──package.json
│   │   ├──tsconfig.json
│   │   └──.env.example
│   ├──frontend
│   │   ├──src
│   │   │   ├──app
│   │   │   │   ├──(auth)
│   │   │   │   │   ├──login
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   └──register
│   │   │   │   │   │   └──page.tsx
│   │   │   │   ├──(dashboard)
│   │   │   │   │   ├──ai-agent
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   ├──connectors
│   │   │   │   │   │   ├──callback
│   │   │   │   │   │   │   └──page.tsx
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   ├──dashboard
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   ├──executions
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   ├──settings
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   ├──whatsapp-agent
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   ├──workflows
│   │   │   │   │   │   ├──[id]
│   │   │   │   │   │   │   └──page.tsx
│   │   │   │   │   │   └──page.tsx
│   │   │   │   │   └──layout.tsx
│   │   │   │   ├──auth
│   │   │   │   │   └──google
│   │   │   │   │   │   └──callback
│   │   │   │   │   │   │   └──page.tsx
│   │   │   │   ├──layout.tsx
│   │   │   │   └──page.tsx
│   │   │   ├──components
│   │   │   │   ├──ai
│   │   │   │   │   └──AIPromptBar.tsx
│   │   │   │   ├──builder
│   │   │   │   │   ├──AICopilotDrawer.tsx
│   │   │   │   │   ├──AppPickerModal.tsx
│   │   │   │   │   ├──CustomEdge.tsx
│   │   │   │   │   ├──CustomNodes.tsx
│   │   │   │   │   ├──FieldMapper.tsx
│   │   │   │   │   ├──NodePalette.tsx
│   │   │   │   │   └──WorkflowCanvas.tsx
│   │   │   │   ├──connectors
│   │   │   │   │   └──GoogleOAuthConsentModal.tsx
│   │   │   │   ├──dashboard
│   │   │   │   │   └──StatCards.tsx
│   │   │   │   ├──layout
│   │   │   │   │   ├──Navbar.tsx
│   │   │   │   │   └──Sidebar.tsx
│   │   │   │   ├──ui
│   │   │   │   │   ├──Badge.tsx
│   │   │   │   │   ├──Button.tsx
│   │   │   │   │   ├──Heading.tsx
│   │   │   │   │   ├──index.ts
│   │   │   │   │   ├──SectionCard.tsx
│   │   │   │   │   └──Text.tsx
│   │   │   │   └──workflow
│   │   │   │   │   ├──AccountConnectModal.tsx
│   │   │   │   │   ├──ConnectionSelector.tsx
│   │   │   │   │   ├──DataTreePicker.tsx
│   │   │   │   │   └──StepSetupDrawer.tsx
│   │   │   ├──context
│   │   │   │   └──UserRoleContext.tsx
│   │   │   ├──lib
│   │   │   │   ├──api-client.ts
│   │   │   │   ├──connector-manifests.ts
│   │   │   │   ├──conversational-templates.ts
│   │   │   │   ├──firebase.ts
│   │   │   │   ├──socket-client.ts
│   │   │   │   └──utils.ts
│   │   │   ├──store
│   │   │   │   └──useWorkflowStore.ts
│   │   │   └──styles
│   │   │   │   ├──globals.css
│   │   │   │   ├──theme.css
│   │   │   │   └──tokens.ts
│   │   ├──Dockerfile
│   │   ├──next-env.d.ts
│   │   ├──next.config.mjs
│   │   ├──package.json
│   │   ├──postcss.config.js
│   │   ├──tailwind.config.ts
│   │   ├──tsconfig.json
│   │   ├──tsconfig.tsbuildinfo
│   │   └──.env.example
│   └──worker
│   │   ├──src
│   │   │   ├──config
│   │   │   │   └──redis.config.ts
│   │   │   ├──engine
│   │   │   │   ├──dag-runner.ts
│   │   │   │   ├──rate-limiter.ts
│   │   │   │   ├──retry-handler.ts
│   │   │   │   └──step-executor.ts
│   │   │   ├──processors
│   │   │   │   └──workflow.processor.ts
│   │   │   └──index.ts
│   │   ├──Dockerfile
│   │   ├──package.json
│   │   └──tsconfig.json
├──docs
│   ├──features
│   │   ├──01_monorepo_and_tooling.md
│   │   ├──02_backend_modular_architecture.md
│   │   ├──03_connector_sdk.md
│   │   ├──04_bullmq_worker_engine.md
│   │   ├──05_frontend_nextjs_ui.md
│   │   ├──06_ai_agent_service.md
│   │   ├──07_database_and_shared_types.md
│   │   └──08_frontend_design_system_and_tokens.md
│   ├──Automation_Platform_Master_Build_Plan.docx
│   ├──MASTER_INTEGRATION_ROADMAP.md
│   ├──PROJECT_MASTER_DOCUMENTATION.md
│   ├──SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md
│   └──TASK_STATUS.md
├──packages
│   ├──config
│   │   ├──eslint.base.json
│   │   └──tsconfig.base.json
│   ├──connector-sdk
│   │   ├──src
│   │   │   ├──auth
│   │   │   │   ├──api-key.strategy.ts
│   │   │   │   ├──oauth2.strategy.ts
│   │   │   │   ├──provider-verifier.ts
│   │   │   │   └──webhook.strategy.ts
│   │   │   ├──connectors
│   │   │   │   ├──amazon-flipkart.connector.ts
│   │   │   │   ├──autoflow-schedule.connector.ts
│   │   │   │   ├──command-router.connector.ts
│   │   │   │   ├──condition.connector.ts
│   │   │   │   ├──google-calendar.connector.ts
│   │   │   │   ├──google-docs.connector.ts
│   │   │   │   ├──google-drive.connector.ts
│   │   │   │   ├──http-request.connector.ts
│   │   │   │   ├──notion.connector.ts
│   │   │   │   ├──stripe.connector.ts
│   │   │   │   ├──telegram.connector.ts
│   │   │   │   ├──universal.connector.ts
│   │   │   │   ├──web-search.connector.ts
│   │   │   │   └──whatsapp.connector.ts
│   │   │   ├──core
│   │   │   │   ├──base-connector.ts
│   │   │   │   ├──manifest-registry.ts
│   │   │   │   └──types.ts
│   │   │   ├──engine
│   │   │   │   ├──dag-runner.ts
│   │   │   │   └──step-executor.ts
│   │   │   ├──integrations
│   │   │   │   ├──ai-node
│   │   │   │   │   └──index.ts
│   │   │   │   ├──anthropic
│   │   │   │   │   └──index.ts
│   │   │   │   ├──github
│   │   │   │   │   ├──actions
│   │   │   │   │   │   ├──branches-files-commits.ts
│   │   │   │   │   │   ├──prs-issues.ts
│   │   │   │   │   │   ├──releases-workflows-collabs-stats.ts
│   │   │   │   │   │   └──repos.ts
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   ├──index.ts
│   │   │   │   │   ├──manifest.ts
│   │   │   │   │   ├──utils.ts
│   │   │   │   │   └──webhook.ts
│   │   │   │   ├──gmail
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   └──index.ts
│   │   │   │   ├──google-drive
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   └──index.ts
│   │   │   │   ├──google-search
│   │   │   │   │   └──index.ts
│   │   │   │   ├──google-sheets
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   └──index.ts
│   │   │   │   ├──hubspot
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   ├──index.ts
│   │   │   │   │   └──webhook.ts
│   │   │   │   ├──jira
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   ├──index.ts
│   │   │   │   │   └──webhook.ts
│   │   │   │   ├──notion
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   └──index.ts
│   │   │   │   ├──openai
│   │   │   │   │   └──index.ts
│   │   │   │   ├──slack
│   │   │   │   │   ├──choices.ts
│   │   │   │   │   └──index.ts
│   │   │   │   ├──stripe
│   │   │   │   │   └──index.ts
│   │   │   │   ├──telegram
│   │   │   │   │   └──index.ts
│   │   │   │   └──whatsapp
│   │   │   │   │   └──index.ts
│   │   │   ├──messaging
│   │   │   │   ├──base-adapter.ts
│   │   │   │   ├──normalized-message.ts
│   │   │   │   └──whatsapp-adapter.ts
│   │   │   └──index.ts
│   │   ├──package.json
│   │   └──tsconfig.json
│   ├──database
│   │   ├──src
│   │   │   ├──models
│   │   │   │   ├──ai-chat.model.ts
│   │   │   │   ├──connection.model.ts
│   │   │   │   ├──execution-log.model.ts
│   │   │   │   ├──organization.model.ts
│   │   │   │   ├──usage.model.ts
│   │   │   │   ├──user-memory.model.ts
│   │   │   │   ├──user.model.ts
│   │   │   │   ├──wa-conversation.model.ts
│   │   │   │   ├──wa-message.model.ts
│   │   │   │   ├──webhook.model.ts
│   │   │   │   ├──whatsapp-automation.model.ts
│   │   │   │   ├──workflow-version.model.ts
│   │   │   │   └──workflow.model.ts
│   │   │   ├──connection.ts
│   │   │   └──index.ts
│   │   ├──package.json
│   │   └──tsconfig.json
│   └──shared-types
│   │   ├──src
│   │   │   ├──api.ts
│   │   │   ├──connector.ts
│   │   │   ├──index.ts
│   │   │   └──workflow.ts
│   │   ├──package.json
│   │   └──tsconfig.json
├──scripts
│   ├──check-latest-logs.js
│   └──test-runner.ts
├──AutoFlow_Current_Architecture.md
├──AutoFlow_Gaps_And_Roadmap.md
├──AutoFlow_Workflow_Engine_Guide.md
├──docker-compose.yml
├──env.example
├──implementation_plan.md
├──package-lock.json
├──package.json
├──README.md
├──turbo.json
├──Zapier_Architecture_Overview.md
├──Zapier_Connector_Schema_And_Data_Mapping.md
├──Zapier.md
└──.gitignore
