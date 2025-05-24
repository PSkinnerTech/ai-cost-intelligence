# 🚀 A/B Testing Platform - Business Intelligence Edition

A **business-focused** web application that enables A/B testing of LLM prompts with **actionable cost optimization** and **automated deployment workflows** using Arize Phoenix's prompt engineering and tracing capabilities.

## 🎯 **Transform Technical Testing → Business Intelligence**

### **Before: Technical Focus**
```
Results: "Variant A wins, p<0.01, 92% fewer tokens"
Action Required: Manual analysis of technical metrics
```

### **After: Business Intelligence** 
```
🏆 OPTIMIZATION COMPLETE: Deploy for $97K Annual Savings!
💰 BUSINESS IMPACT: 92% Cost Reduction, 100% Quality Maintained
🚀 READY FOR ACTION: [Deploy] [Export Code] [Email Summary]
```

## ✨ **Key Features**

### 🔥 **Business Intelligence (Phase 5 - In Progress)**
- **ROI-Driven Results**: Specific dollar savings with annual projections
- **One-Click Deployment**: Automated workflows to production
- **Executive Reporting**: C-level visibility and recommendations  
- **Continuous Optimization**: Smart opportunity identification

### ✅ **Technical Excellence (Complete)**
- **Real-time A/B Testing**: Side-by-side prompt comparison
- **Advanced Cost Tracking**: Token-level cost analysis with Phoenix integration
- **Statistical Analysis**: Confidence intervals and significance testing
- **Professional UI**: Responsive React interface with real-time updates

## 🏗️ **Architecture**

### **Frontend (React/TypeScript)**
- Prompt Editor with Monaco integration
- Real-time A/B testing interface  
- Business Intelligence dashboard
- Cost visualization and analytics

### **Backend (Node.js/Express)**
- Phoenix Client integration
- OpenTelemetry instrumentation
- WebSocket real-time updates
- Comprehensive API (16 endpoints)

### **Intelligence Layer**
- Business Impact Calculator
- ROI projection engine
- Deployment readiness scoring
- Executive summary generator

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- Phoenix server (local or cloud)
- OpenAI API key

### **1. Environment Setup**
```bash
# Clone the repository
git clone <repository-url>
cd arizegui

# Copy environment template
cp env.template .env

# Add your API keys to .env
OPENAI_API_KEY=your-openai-key
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
```

### **2. Install Dependencies**
```bash
# Backend dependencies
npm install

# Frontend dependencies  
cd frontend
npm install
cd ..
```

### **3. Start Phoenix Server**
```bash
# Option 1: Local installation
pip install arize-phoenix
phoenix serve

# Option 2: Docker
docker run -p 6006:6006 arizephoenix/phoenix:latest
```

### **4. Run the Application**
```bash
# Start backend (Terminal 1)
npm start

# Start frontend (Terminal 2)  
cd frontend
npm start
```

### **5. Access the Platform**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Phoenix UI: http://localhost:6006

## 🎯 **Usage Example**

### **1. Create A/B Test**
```typescript
// Variant A: Cost-optimized
"What is {{topic}}? Give me a brief overview."

// Variant B: Comprehensive  
"Can you explain {{topic}} thoroughly with examples?"
```

### **2. Run Comparison**
- Upload test dataset or use built-in examples
- Click "Run Full A/B Test"
- Watch real-time execution with cost tracking

### **3. Get Business Intelligence**
```
🏆 OPTIMIZATION COMPLETE
Variant A delivers 92% cost reduction with 100% quality maintained

💰 BUSINESS IMPACT
├─ Cost Reduction: 92% ($4/month savings)  
├─ Quality Score: 100% satisfaction maintained
├─ Performance: +66% faster responses
└─ Efficiency: 8.4x more token efficient

🎯 DEPLOYMENT RECOMMENDATION
Deploy immediately - High confidence, minimal risk
Expected payback: Immediate cost reduction

🚀 READY FOR ACTION
[Deploy to Production] [Export Optimized Code] [Email Summary]
```

## 📊 **Project Status**

### ✅ **Completed Phases**
- **Phase 1**: Foundation Setup (Phoenix, APIs, Environment)
- **Phase 2**: Backend Development (16 API endpoints, WebSocket)  
- **Phase 3**: Frontend Development (React UI, real-time updates)
- **Phase 4**: Integration & Features (A/B testing, statistical analysis)

### 🎯 **Current: Phase 5 - Business Intelligence**
- ROI-driven results with dollar amounts
- Executive dashboard and reporting
- One-click deployment workflows
- Continuous optimization recommendations

## 🛠️ **Technology Stack**

### **Frontend**
- React 18 with TypeScript
- Tailwind CSS for styling
- Monaco Editor for prompt editing
- Recharts for visualizations
- WebSocket for real-time updates

### **Backend**  
- Node.js with Express
- OpenTelemetry instrumentation
- Phoenix Client integration
- WebSocket server
- Comprehensive test suite

### **Integrations**
- Arize Phoenix for tracing
- OpenAI API for LLM calls
- Real-time cost calculation
- Statistical analysis engine

## 📚 **Documentation**

- [Implementation Guide](docs/GUIDE.md) - Complete setup instructions
- [Architecture Overview](docs/ARCHITECTURE.md) - Technical architecture  
- [Development Roadmap](docs/ROADMAP.md) - Project phases and status

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 **Links**

- [Arize Phoenix Documentation](https://docs.arize.com/phoenix)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)

---

**🎯 Built to transform technical A/B testing into actionable business intelligence.** 