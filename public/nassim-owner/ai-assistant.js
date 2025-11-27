// AI Assistant for Owner
class AIAssistant {
    constructor() {
        this.conversationHistory = [];
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        // Create FAB button
        const fab = document.createElement('div');
        fab.className = 'ai-assistant-fab';
        fab.id = 'aiAssistantFab';
        fab.innerHTML = '🤖';
        fab.title = 'المساعد الذكي';
        document.body.appendChild(fab);

        // Create chat modal
        const modal = document.createElement('div');
        modal.className = 'ai-chat-modal';
        modal.id = 'aiChatModal';
        modal.innerHTML = `
            <div class="ai-chat-header">
                <div class="ai-chat-header-content">
                    <div class="ai-chat-header-icon">🤖</div>
                    <div class="ai-chat-header-text">
                        <h3>مستشار الأعمال الذكي</h3>
                        <p>تحليل وتوصيات لتحسين أداء صالونك</p>
                    </div>
                </div>
                <button class="ai-chat-close" id="aiChatClose">×</button>
            </div>

            <div class="ai-quick-suggestions">
                <div class="ai-suggestion-chip" onclick="aiAssistant.sendSuggestion('حلل أداء الصالون هذا الشهر')">📊 تحليل الأداء</div>
                <div class="ai-suggestion-chip" onclick="aiAssistant.sendSuggestion('اقترح طرق لزيادة الإيرادات')">💰 زيادة الإيرادات</div>
                <div class="ai-suggestion-chip" onclick="aiAssistant.sendSuggestion('كيف أحسن رضا العملاء؟')">⭐ رضا العملاء</div>
            </div>

            <div class="ai-chat-messages" id="aiChatMessages">
                <div class="ai-message assistant">
                    <div class="ai-message-avatar">🤖</div>
                    <div class="ai-message-content">
                        <div class="ai-message-bubble">مرحباً! أنا مستشارك الذكي 👋<br><br>يمكنني مساعدتك في:<br>
                        • تحليل أداء صالونك<br>
                        • اقتراح استراتيجيات للنمو<br>
                        • تحسين تجربة العملاء<br>
                        • إدارة الموظفين بكفاءة<br><br>
                        اسألني أي شيء! 💡</div>
                    </div>
                </div>
            </div>

            <div class="ai-typing-indicator" id="aiTypingIndicator">
                <div class="ai-message-avatar" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">🤖</div>
                <div class="ai-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>

            <div class="ai-chat-input-container">
                <div class="ai-chat-input-wrapper">
                    <textarea 
                        id="aiChatInput" 
                        class="ai-chat-input" 
                        placeholder="اسأل مستشارك الذكي..."
                        rows="1"
                    ></textarea>
                    <button class="ai-send-button" id="aiSendButton">
                        ➤
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setupEventListeners() {
        const fab = document.getElementById('aiAssistantFab');
        const modal = document.getElementById('aiChatModal');
        const closeBtn = document.getElementById('aiChatClose');
        const input = document.getElementById('aiChatInput');
        const sendBtn = document.getElementById('aiSendButton');

        fab.addEventListener('click', () => this.toggle());
        closeBtn.addEventListener('click', () => this.close());

        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 80) + 'px';
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn.addEventListener('click', () => this.sendMessage());
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const modal = document.getElementById('aiChatModal');
        if (this.isOpen) {
            modal.classList.add('active');
            document.getElementById('aiChatInput').focus();
        } else {
            modal.classList.remove('active');
        }
    }

    close() {
        this.isOpen = false;
        document.getElementById('aiChatModal').classList.remove('active');
    }

    sendSuggestion(text) {
        document.getElementById('aiChatInput').value = text;
        this.sendMessage();
    }

    async sendMessage() {
        const input = document.getElementById('aiChatInput');
        const sendBtn = document.getElementById('aiSendButton');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';

        // Disable input
        sendBtn.disabled = true;
        input.disabled = true;

        // Show typing indicator
        document.getElementById('aiTypingIndicator').classList.add('active');
        this.scrollToBottom();

        try {
            const response = await fetch(`${API_URL}/ai/chat/owner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    message,
                    businessId: NASSIM_BUSINESS_ID,
                    conversationHistory: this.conversationHistory
                })
            });

            const data = await response.json();

            if (data.success) {
                this.conversationHistory = data.data.conversationHistory;
                
                // Add stats card if available
                if (data.data.stats) {
                    this.addStatsCard(data.data.stats);
                }
                
                // Add AI response
                this.addMessage('assistant', data.data.response);
            } else {
                this.addMessage('assistant', '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.');
            }
        } catch (error) {
            console.error('AI Error:', error);
            this.addMessage('assistant', '❌ عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.');
        } finally {
            document.getElementById('aiTypingIndicator').classList.remove('active');
            sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${role}`;

        const avatar = role === 'user' ? '👤' : '🤖';
        const time = new Date().toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="ai-message-avatar">${avatar}</div>
            <div class="ai-message-content">
                <div class="ai-message-bubble">${content}</div>
                <div class="ai-message-time">${time}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addStatsCard(stats) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const statsCard = document.createElement('div');
        statsCard.className = 'ai-stats-card';
        statsCard.innerHTML = `
            <h4>📊 إحصائيات الصالون</h4>
            <div class="ai-stats-grid">
                <div class="ai-stat-item">
                    <div class="ai-stat-value">${stats.totalAppointments || 0}</div>
                    <div class="ai-stat-label">المواعيد</div>
                </div>
                <div class="ai-stat-item">
                    <div class="ai-stat-value">${stats.monthlyRevenue || 0} ر.س</div>
                    <div class="ai-stat-label">الإيرادات</div>
                </div>
                <div class="ai-stat-item">
                    <div class="ai-stat-value">${stats.totalCustomers || 0}</div>
                    <div class="ai-stat-label">العملاء</div>
                </div>
                <div class="ai-stat-item">
                    <div class="ai-stat-value">${stats.averageRating || 0} ⭐</div>
                    <div class="ai-stat-label">التقييم</div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(statsCard);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('aiChatMessages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

// Initialize AI Assistant
let aiAssistant;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for main app to load
    setTimeout(() => {
        aiAssistant = new AIAssistant();
    }, 1000);
});
