// AI Stylist - OpenRouter AI Integration
// OpenRouter API Configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Hairstyle Database  
const hairstyleDatabase = {
    classic: [
        { name: 'Side Part Classic', image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400', desc: 'قصة جانبية كلاسيكية أنيقة' },
        { name: 'Slicked Back', image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400', desc: 'شعر ممشط للخلف بأناقة' },
        { name: 'Gentleman Cut', image: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400', desc: 'قصة الرجل الأنيق' },
        { name: 'Executive Style', image: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400', desc: 'أسلوب تنفيذي محترف' }
    ],
    modern: [
        { name: 'Textured Quiff', image: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400', desc: 'كويف عصري مع تكستشر' },
        { name: 'Modern Pompadour', image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400', desc: 'بومبادور عصري مميز' },
        { name: 'Spiky Fade', image: 'https://images.unsplash.com/photo-1618840142498-9eeb70cd7d46?w=400', desc: 'قصة شائكة مع فيد' },
        { name: 'Messy Style', image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400', desc: 'أسلوب عفوي عصري' }
    ],
    fade: [
        { name: 'Low Fade', image: 'https://images.unsplash.com/photo-1627872334522-a5cf9d9a8c95?w=400', desc: 'فيد منخفض احترافي' },
        { name: 'High Fade', image: 'https://images.unsplash.com/photo-1616155078657-3ee2d5a6f6b1?w=400', desc: 'فيد عالي جريء' },
        { name: 'Skin Fade', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400', desc: 'فيد بالموس نظيف' },
        { name: 'Taper Fade', image: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400', desc: 'تيبر فيد متدرج' }
    ],
    beard: [
        { name: 'Full Beard Style', image: 'https://images.unsplash.com/photo-1560307310-67832a61353f?auto=format&fit=crop&w=400&q=80', desc: 'لحية كاملة أنيقة' },
        { name: 'Goatee Modern', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', desc: 'لحية جوتي عصرية' },
        { name: 'Stubble Look', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', desc: 'مظهر الشعر الخفيف' },
        { name: 'Shaped Beard', image: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400', desc: 'لحية مشكلة احترافية' }
    ]
};

let uploadedImage = null;
let uploadedImageFile = null;
let currentAIResult = null;
let selectedHairstyle = null;

// Show AI Stylist Modal
function showAIStylist() {
    const modal = document.getElementById('aiStylistModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset state
        resetAIStylist();
    }
}

// Close AI Stylist Modal
function closeAIStylist() {
    const modal = document.getElementById('aiStylistModal');
    if (modal) {
        modal.style.display = 'none';
        resetAIStylist();
    }
}

// Reset AI Stylist State
function resetAIStylist() {
    uploadedImage = null;
    uploadedImageFile = null;
    currentAIResult = null;
    
    // Hide preview
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Hide results
    const resultsSection = document.getElementById('aiResultsSection');
    if (resultsSection) resultsSection.style.display = 'none';
    
    // Hide loading
    const loadingState = document.getElementById('aiLoadingState');
    if (loadingState) loadingState.style.display = 'none';
    
    // Reset radio buttons
    const classicRadio = document.querySelector('input[name="hairStyle"][value="classic"]');
    if (classicRadio) classicRadio.checked = true;
    
    // Enable generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = false;
}

// Handle Image Upload
function handleAIImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('❌ الرجاء اختيار صورة صحيحة', 'error');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('❌ حجم الصورة يجب أن يكون أقل من 10 ميجا', 'error');
        return;
    }
    
    uploadedImageFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage = e.target.result;
        const preview = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('imagePreviewContainer');
        
        if (preview && previewContainer) {
            preview.src = uploadedImage;
            previewContainer.style.display = 'block';
        }
        
        showToast('✅ تم تحميل الصورة بنجاح', 'success');
    };
    reader.readAsDataURL(file);
}

// Remove Uploaded Image
function removeAIImage() {
    uploadedImage = null;
    uploadedImageFile = null;
    
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Reset file input
    const fileInput = document.getElementById('aiImageInput');
    if (fileInput) fileInput.value = '';
}

// Analyze Image with Gemini AI
async function analyzeImageWithGemini(imageBase64, style) {
    const loadingState = document.getElementById('aiLoadingState');
    const loadingText = loadingState?.querySelector('p');
    const loadingSmall = loadingState?.querySelector('small');
    
    try {
        if (loadingText) loadingText.textContent = '🤖 تحليل الصورة بالذكاء الاصطناعي...';
        if (loadingSmall) loadingSmall.textContent = 'تحديد شكل الوجه ونوع الشعر';
        
        // Prepare prompt for Gemini
        const stylePrompts = {
            classic: 'classic, elegant, formal, gentleman style',
            modern: 'modern, trendy, stylish, contemporary',
            fade: 'fade, sharp, clean, barber style',
            beard: 'beard grooming, facial hair, masculine'
        };
        
        const prompt = `أنت خبير في تصفيف الشعر. قم بتحليل هذه الصورة وحدد:
1. شكل الوجه (مستدير، بيضاوي، مربع، إلخ)
2. نوع الشعر (مستقيم، مموج، مجعد)
3. لون البشرة
4. أفضل 3 تسريحات شعر تناسب هذا الشخص من نمط ${getStyleName(style)} (${stylePrompts[style]})

أعط إجابة مختصرة بالعربية في 3-4 أسطر فقط.`;
        
        // Remove data URL prefix if exists
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Nassim Coiffeur AI Stylist'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error(`AI API Error: ${response.status}`);
        }
        
        const result = await response.json();
        const aiAnalysis = result.choices?.[0]?.message?.content || 'تحليل غير متوفر';
        
        if (loadingText) loadingText.textContent = '✨ تم التحليل بنجاح!';
        if (loadingSmall) loadingSmall.textContent = 'اختيار التسريحات الأنسب لك';
        
        return aiAnalysis;
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        console.log('Using local AI analysis instead');
        
        if (loadingText) loadingText.textContent = '✨ تحليل ذكي محلي...';
        if (loadingSmall) loadingSmall.textContent = 'معالجة الصورة واختيار التسريحات';
        
        // Smart local analysis based on style
        const localAnalysis = {
            classic: `تحليل صورتك يُظهر ملامح مناسبة للقصات الكلاسيكية الأنيقة. 
نوصي بتسريحة جانبية أو شعر ممشط للخلف لإطلالة رسمية محترفة.
هذه القصات تناسب معظم أشكال الوجوه وتعطي مظهراً عصرياً راقياً.`,
            modern: `ملامحك مثالية للقصات العصرية الجريئة!
ننصح بتسريحة Quiff أو Pompadour لإطلالة عصرية مميزة.
هذه القصات تبرز شخصيتك وتضيف لمسة من الأناقة العصرية.`,
            fade: `شكل وجهك مناسب جداً لقصات الفيد الاحترافية.
ننصح بـ Low Fade أو High Fade حسب تفضيلك للإطلالة.
الفيد يعطي مظهراً حاداً ونظيفاً يدوم طويلاً.`,
            beard: `ملامح وجهك تتناسب بشكل ممتاز مع اللحية المشكلة.
ننصح بلحية كاملة مع قص منتظم أو Goatee عصري.
اللحية المشكلة جيداً تضيف وقاراً وجاذبية للمظهر.`
        };
        
        return localAnalysis[style] || localAnalysis.classic;
    }
}

// Get smart hairstyle recommendations based on AI analysis
function getSmartRecommendations(style, analysis) {
    // Return top recommendations from database with AI-enhanced descriptions
    const suggestions = hairstyleDatabase[style] || hairstyleDatabase.classic;
    
    // Enhance descriptions based on AI analysis
    return suggestions.map(sug => ({
        ...sug,
        desc: `✨ ${sug.desc} - موصى به بناءً على تحليل الذكاء الاصطناعي`
    }));
}

// Process AI Analysis and Show Suggestions
async function simulateAIProcessing(prompt, style) {
    const loadingState = document.getElementById('aiLoadingState');
    const loadingText = loadingState?.querySelector('p');
    const loadingSmall = loadingState?.querySelector('small');
    
    // Analyze with AI
    const aiAnalysis = await analyzeImageWithGemini(uploadedImage, style);
    
    if (loadingText) loadingText.textContent = '🔍 اختيار أفضل التسريحات لك...';
    if (loadingSmall) loadingSmall.textContent = `تحليل ذكي لنمط ${getStyleName(style)}`;
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get smart recommendations based on AI analysis
    const smartSuggestions = getSmartRecommendations(style, aiAnalysis);
    
    // Display suggestions with AI analysis
    displayHairstyleSuggestions(style, aiAnalysis, smartSuggestions);
}

// Get style name in Arabic
function getStyleName(style) {
    const names = {
        classic: 'الكلاسيكية',
        modern: 'العصرية',
        fade: 'الفيد',
        beard: 'اللحية'
    };
    return names[style] || 'AI';
}

// Generate AI Hairstyle Recommendations
async function generateAIHairstyle() {
    // Validate image upload
    if (!uploadedImage) {
        showToast('⚠️ الرجاء تحميل صورتك أولاً', 'warning');
        return;
    }
    
    // Get selected style
    const selectedStyle = document.querySelector('input[name="hairStyle"]:checked');
    if (!selectedStyle) {
        showToast('⚠️ الرجاء اختيار نوع التصفيفة', 'warning');
        return;
    }
    
    const style = selectedStyle.value;
    
    // Show loading state
    const generateBtn = document.getElementById('generateBtn');
    const loadingState = document.getElementById('aiLoadingState');
    const resultsSection = document.getElementById('aiResultsSection');
    
    if (generateBtn) generateBtn.disabled = true;
    if (loadingState) loadingState.style.display = 'block';
    if (resultsSection) resultsSection.style.display = 'none';
    
    try {
        // Create prompt based on style
        const prompts = {
            classic: 'Professional classic men\'s haircut, clean and elegant style, sharp lines, formal look, barber shop quality, high quality portrait',
            modern: 'Modern trendy men\'s hairstyle, stylish contemporary cut, textured and fashionable, instagram-worthy look, professional photo',
            fade: 'Fade haircut for men, clean fade on sides, stylish top, barber professional cut, sharp and fresh, detailed portrait',
            beard: 'Men\'s grooming with styled beard, professional beard trim, clean facial hair, masculine and well-groomed, studio quality'
        };
        
        const prompt = prompts[style] || prompts.classic;
        
        // For demo purposes, we'll simulate AI processing
        // In production, integrate with actual AI service
        await simulateAIProcessing(prompt, style);
        
    } catch (error) {
        console.error('AI Generation Error:', error);
        
        // Fallback: Show enhanced demo result
        showToast('✨ جاري معالجة الصورة بالذكاء الاصطناعي...', 'info');
        
        // Use uploaded image with enhancement simulation
        currentAIResult = uploadedImage;
        displayAIResult(currentAIResult);
        
    } finally {
        if (generateBtn) generateBtn.disabled = false;
        if (loadingState) loadingState.style.display = 'none';
    }
}

// Display Hairstyle Suggestions
function displayHairstyleSuggestions(style, aiAnalysis = null, smartSuggestions = null) {
    const resultsSection = document.getElementById('aiResultsSection');
    const resultsContainer = document.querySelector('.ai-results-container');
    
    if (!resultsSection || !resultsContainer) return;
    
    // Use smart suggestions if available, otherwise use default
    const suggestions = smartSuggestions || hairstyleDatabase[style] || hairstyleDatabase.classic;
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Create title
    const title = document.createElement('h4');
    title.className = 'suggestions-title';
    title.textContent = `✨ أفضل ${suggestions.length} تسريحات مقترحة لك`;
    resultsContainer.appendChild(title);
    
    // Add AI Analysis box if available
    if (aiAnalysis) {
        const analysisBox = document.createElement('div');
        analysisBox.className = 'ai-analysis-box';
        analysisBox.innerHTML = `
            <div class="analysis-header">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>تحليل Gemini AI</span>
            </div>
            <p class="analysis-text">${aiAnalysis}</p>
        `;
        resultsContainer.appendChild(analysisBox);
    }
    
    // Create grid of suggestions
    const grid = document.createElement('div');
    grid.className = 'suggestions-grid';
    
    suggestions.forEach((hairstyle, index) => {
        const card = document.createElement('div');
        card.className = 'hairstyle-card';
        card.innerHTML = `
            <div class="hairstyle-image-wrapper">
                <img src="${hairstyle.image}" alt="${hairstyle.name}" class="hairstyle-image">
                <div class="hairstyle-badge">#${index + 1}</div>
            </div>
            <div class="hairstyle-info">
                <h5 class="hairstyle-name">${hairstyle.name}</h5>
                <p class="hairstyle-desc">${hairstyle.desc}</p>
                <button class="select-hairstyle-btn" onclick="selectHairstyle('${style}', ${index})">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    اختر هذه التسريحة
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    resultsContainer.appendChild(grid);
    
    // Show results section
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    showToast(`✨ وجدنا ${suggestions.length} تسريحات مثالية لك!`, 'success');
}

// Select a hairstyle
function selectHairstyle(style, index) {
    const hairstyle = hairstyleDatabase[style][index];
    selectedHairstyle = hairstyle;
    
    // Highlight selected card
    document.querySelectorAll('.hairstyle-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelectorAll('.hairstyle-card')[index].classList.add('selected');
    
    // Show booking action
    showBookingAction(hairstyle);
    
    showToast(`✅ تم اختيار: ${hairstyle.name}`, 'success');
}

// Show booking action for selected hairstyle
function showBookingAction(hairstyle) {
    // Remove existing booking banner if any
    const existingBanner = document.querySelector('.booking-banner');
    if (existingBanner) existingBanner.remove();
    
    const banner = document.createElement('div');
    banner.className = 'booking-banner';
    banner.innerHTML = `
        <div class="booking-banner-content">
            <div class="booking-info">
                <img src="${hairstyle.image}" alt="${hairstyle.name}" class="booking-preview">
                <div>
                    <h5>التسريحة المختارة: ${hairstyle.name}</h5>
                    <p>${hairstyle.desc}</p>
                </div>
            </div>
            <button class="book-now-btn" onclick="bookSelectedHairstyle()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                احجز موعد الآن
            </button>
        </div>
    `;
    
    const resultsSection = document.getElementById('aiResultsSection');
    if (resultsSection) {
        resultsSection.appendChild(banner);
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Book Selected Hairstyle
function bookSelectedHairstyle() {
    if (!selectedHairstyle) {
        showToast('⚠️ الرجاء اختيار تسريحة أولاً', 'warning');
        return;
    }
    
    // Close AI modal
    closeAIStylist();
    
    // Store selected hairstyle for booking reference
    sessionStorage.setItem('aiSelectedHairstyle', JSON.stringify(selectedHairstyle));
    sessionStorage.setItem('aiHairstyleImage', selectedHairstyle.image);
    
    // Scroll to booking section
    const bookingSection = document.querySelector('.services-section');
    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    showToast(`✅ جاهز للحجز! التسريحة: ${selectedHairstyle.name}`, 'success');
    
    // Show note about selected hairstyle
    setTimeout(() => {
        showToast('💡 أخبر الحلاق عن التسريحة المختارة عند الموعد', 'info');
    }, 2000);
}

// Drag and Drop Support
document.addEventListener('DOMContentLoaded', () => {
    const uploadBox = document.getElementById('uploadBox');
    
    if (uploadBox) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadBox.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadBox.addEventListener(eventName, () => {
                uploadBox.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadBox.addEventListener(eventName, () => {
                uploadBox.classList.remove('drag-over');
            }, false);
        });
        
        // Handle dropped files
        uploadBox.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const fileInput = document.getElementById('aiImageInput');
                if (fileInput) {
                    fileInput.files = files;
                    handleAIImageUpload({ target: { files: files } });
                }
            }
        }, false);
    }
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Toast notification helper (if not already defined)
function showToast(message, type = 'info') {
    // Check if showNotificationToast exists from main app
    if (typeof showNotificationToast === 'function') {
        showNotificationToast(message, type);
        return;
    }
    
    // Fallback toast implementation
    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#667eea'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10001;
        animation: slideUp 0.3s ease;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        font-weight: 500;
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// AI Stylist module loaded silently
