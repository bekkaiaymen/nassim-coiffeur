// AI Stylist - Nano Banana Integration
// API Configuration
const NANO_BANANA_API_KEY = 'd8b63d13b884c0f284533e6927b651be';
const NANO_BANANA_API_URL = 'https://api.nanobanana.ai/v1/generate';

let uploadedImage = null;
let uploadedImageFile = null;
let currentAIResult = null;

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

// Generate AI Hairstyle
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
            classic: 'Professional classic men\'s haircut, clean and elegant style, sharp lines, formal look, barber shop quality',
            modern: 'Modern trendy men\'s hairstyle, stylish contemporary cut, textured and fashionable, instagram-worthy look',
            fade: 'Fade haircut for men, clean fade on sides, stylish top, barber professional cut, sharp and fresh',
            beard: 'Men\'s grooming with styled beard, professional beard trim, clean facial hair, masculine and well-groomed'
        };
        
        const prompt = prompts[style] || prompts.classic;
        
        // Convert image to base64 if needed
        const imageBase64 = uploadedImage.split(',')[1] || uploadedImage;
        
        // Call Nano Banana API
        const response = await fetch(NANO_BANANA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NANO_BANANA_API_KEY}`
            },
            body: JSON.stringify({
                model: 'stable-diffusion-xl',
                prompt: prompt,
                image: imageBase64,
                strength: 0.75,
                guidance_scale: 7.5,
                num_inference_steps: 50,
                width: 512,
                height: 512
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Check if result has image
        if (result.output && result.output.length > 0) {
            currentAIResult = result.output[0];
            displayAIResult(currentAIResult);
        } else {
            throw new Error('No image generated');
        }
        
    } catch (error) {
        console.error('AI Generation Error:', error);
        
        // Fallback: Show demo result for testing
        showToast('⚠️ حدث خطأ في الاتصال بالذكاء الاصطناعي، جاري عرض نموذج تجريبي', 'warning');
        
        // Use uploaded image as demo result
        currentAIResult = uploadedImage;
        displayAIResult(currentAIResult);
        
    } finally {
        if (generateBtn) generateBtn.disabled = false;
        if (loadingState) loadingState.style.display = 'none';
    }
}

// Display AI Result
function displayAIResult(imageUrl) {
    const resultsSection = document.getElementById('aiResultsSection');
    const resultImage = document.getElementById('resultImage');
    
    if (resultsSection) resultsSection.style.display = 'block';
    if (resultImage) {
        resultImage.src = imageUrl;
        resultImage.style.animation = 'fadeIn 0.5s ease';
    }
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    showToast('✨ تم توليد التصفيفة بنجاح!', 'success');
}

// Book AI Hairstyle
function bookAIHairstyle() {
    if (!currentAIResult) {
        showToast('⚠️ لا يوجد تصفيفة لحجزها', 'warning');
        return;
    }
    
    // Close AI modal
    closeAIStylist();
    
    // Store AI result for booking reference
    sessionStorage.setItem('aiHairstyleImage', currentAIResult);
    
    // Scroll to booking section
    const bookingSection = document.querySelector('.services-section');
    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    showToast('✅ يمكنك الآن اختيار الخدمات وإتمام الحجز', 'success');
}

// Download AI Image
function downloadAIImage() {
    if (!currentAIResult) {
        showToast('⚠️ لا يوجد صورة لتحميلها', 'warning');
        return;
    }
    
    try {
        // Create download link
        const link = document.createElement('a');
        link.href = currentAIResult;
        link.download = `nassim-ai-hairstyle-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('✅ تم تحميل الصورة بنجاح', 'success');
    } catch (error) {
        console.error('Download Error:', error);
        showToast('❌ حدث خطأ أثناء تحميل الصورة', 'error');
    }
}

// Retry AI Generation
function retryAIGeneration() {
    const resultsSection = document.getElementById('aiResultsSection');
    if (resultsSection) resultsSection.style.display = 'none';
    
    currentAIResult = null;
    
    showToast('🔄 يمكنك تجربة نمط آخر الآن', 'info');
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

console.log('✨ AI Stylist Module Loaded - Nano Banana Integration Ready');
