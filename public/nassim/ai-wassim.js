// مساعد الزبون الذكي wassim
class WassimAI {
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
        // لا ننشئ زر عائم هنا - سنستخدم الأيقونة الجديدة
        // نافذة الدردشة
        const modal = document.createElement('div');
        modal.className = 'wassim-ai-modal';
        modal.id = 'wassimAIModal';
        modal.innerHTML = `
            <div class="wassim-ai-header">
                <div class="wassim-ai-header-content">
                    <div class="wassim-ai-header-icon">
                        <div class="wassim-header-avatar">W</div>
                    </div>
                    <div class="wassim-ai-header-text">
                        <h3>wassim - مساعد الزبون</h3>
                        <p>Nassim Coiffeur</p>
                    </div>
                </div>
                <button class="wassim-ai-close" id="wassimAIClose">×</button>
            </div>
            <div class="wassim-quick-suggestions">
                <div class="wassim-suggestion-chip" onclick="wassimAI.sendSuggestion('ما هي خدمات الصالون يا wassim؟')">📋 الخدمات</div>
                <div class="wassim-suggestion-chip" onclick="wassimAI.sendSuggestion('كم سعر قص الشعر يا wassim؟')">💰 الأسعار</div>
                <div class="wassim-suggestion-chip" onclick="wassimAI.sendSuggestion('ما هي ساعات العمل يا wassim؟')">⏰ ساعات العمل</div>
                <div class="wassim-suggestion-chip" onclick="wassimAI.sendSuggestion('أريد حجز موعد مع wassim')">📅 حجز موعد</div>
            </div>
            <div class="wassim-ai-messages" id="wassimAIMessages">
                <div class="wassim-message assistant">
                    <div class="wassim-message-avatar">
                        <div class="wassim-avatar-initial">W</div>
                    </div>
                    <div class="wassim-message-content">
                        <div class="wassim-message-bubble">مرحباً! أنا <b>wassim</b> مساعدك الذكي في صالون <strong>Nassim Coiffeur</strong>.<br>اسألني عن أي خدمة أو سعر أو احجز موعدك بسهولة!</div>
                    </div>
                </div>
            </div>
            <div class="wassim-typing-indicator" id="wassimTypingIndicator">
                <div class="wassim-message-avatar">
                    <div class="wassim-avatar-initial">W</div>
                </div>
                <div class="wassim-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div class="wassim-chat-input-container">
                <div class="wassim-chat-input-wrapper">
                    <textarea id="wassimChatInput" class="wassim-chat-input" placeholder="اكتب سؤالك هنا..." rows="1"></textarea>
                    <button class="wassim-send-button" id="wassimSendButton">➤</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    setupEventListeners() {
        // ربط الأيقونة الجديدة بالمحادثة
        const newIcon = document.getElementById('aiFloatingIcon');
        if (newIcon) {
            newIcon.addEventListener('click', (e) => {
                // فقط إذا لم يكن سحب
                if (!e.target.closest('.ai-floating-icon')?.dataset.dragging) {
                    this.toggle();
                }
            });
        }
        
        const modal = document.getElementById('wassimAIModal');
        const closeBtn = document.getElementById('wassimAIClose');
        const input = document.getElementById('wassimChatInput');
        const sendBtn = document.getElementById('wassimSendButton');
        closeBtn.addEventListener('click', () => this.close());
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 80) + 'px';
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                wassimAI.sendMessage();
            }
        });
        sendBtn.addEventListener('click', () => this.sendMessage());
    }
    toggle() {
        this.isOpen = !this.isOpen;
        const modal = document.getElementById('wassimAIModal');
        if (this.isOpen) {
            modal.classList.add('active');
            document.getElementById('wassimChatInput').focus();
        } else {
            modal.classList.remove('active');
        }
    }
    close() {
        this.isOpen = false;
        document.getElementById('wassimAIModal').classList.remove('active');
    }
    sendSuggestion(text) {
        document.getElementById('wassimChatInput').value = text;
        this.sendMessage();
    }
    async sendMessage() {
        const input = document.getElementById('wassimChatInput');
        const sendBtn = document.getElementById('wassimSendButton');
        const message = input.value.trim();
        if (!message) return;
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';
        sendBtn.disabled = true;
        input.disabled = true;
        document.getElementById('wassimTypingIndicator').classList.add('active');
        this.scrollToBottom();
        try {
            const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://nassim-coiffeur.onrender.com/api';
            const BUSINESS_ID = '69259331651b1babc1eb83dc';
            const response = await fetch(`${API_URL}/ai/chat/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    businessId: BUSINESS_ID,
                    conversationHistory: this.conversationHistory
                })
            });
            const data = await response.json();
            if (data.success) {
                this.conversationHistory = data.data.conversationHistory;
                this.addMessage('assistant', data.data.response);
            } else {
                this.addMessage('assistant', '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.');
            }
        } catch (error) {
            this.addMessage('assistant', '❌ عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.');
        } finally {
            document.getElementById('wassimTypingIndicator').classList.remove('active');
            sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }
    addMessage(role, content) {
        const messagesContainer = document.getElementById('wassimAIMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `wassim-message ${role}`;
        const avatar = role === 'user' ? '👤' : '<div class="wassim-avatar-initial">W</div>';
        const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        messageDiv.innerHTML = `
            <div class="wassim-message-avatar">${avatar}</div>
            <div class="wassim-message-content">
                <div class="wassim-message-bubble">${content}</div>
                <div class="wassim-message-time">${time}</div>
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    scrollToBottom() {
        const container = document.getElementById('wassimAIMessages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}
let wassimAI;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        wassimAI = new WassimAI();
    }, 1000);
});
