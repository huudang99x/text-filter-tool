// DOM Elements
const uploadedContent = document.getElementById('uploadedContent');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const resultOutput = document.getElementById('resultOutput');
const keywordInput = document.getElementById('keyword');
const filterType = document.getElementById('filterType');
const keywordList = document.getElementById('keywordList');
const multipleKeywords = document.getElementById('multipleKeywords');
const caseSensitive = document.getElementById('caseSensitive');
const invertFilter = document.getElementById('invertFilter');
const removeEmpty = document.getElementById('removeEmpty');
const messageBox = document.getElementById('message');
const totalLinesEl = document.getElementById('totalLines');
const matchedLinesEl = document.getElementById('matchedLines');
const percentageEl = document.getElementById('percentage');

let currentText = '';

// Message Functions
function showMessage(text, type = 'info') {
    messageBox.textContent = text;
    messageBox.className = `message show ${type}`;
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 5000);
}

function hideMessage() {
    messageBox.className = 'message';
}

// Tab Navigation
function switchTab(tabId) {
    // Remove active class from all buttons and contents
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    // Add active class to clicked button and corresponding content
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Auto-sync text between tabs
    if (tabId === 'manual' && currentText) {
        textInput.value = currentText;
    } else if (tabId === 'upload' && textInput.value) {
        uploadedContent.value = textInput.value;
    }
}

// Update Filter UI based on selected filter type
function updateFilterUI() {
    const type = filterType.value;
    const inputs = document.getElementById('filterInputs');
    const multiple = document.getElementById('multipleKeywords');

    if (type === 'multiple') {
        multiple.style.display = 'block';
        inputs.style.display = 'none';
    } else {
        multiple.style.display = 'none';
        inputs.style.display = 'block';
    }
}

// File Upload Handler
fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) {
        showMessage('Vui lòng chọn file để lọc.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const content = e.target.result;
            currentText = content;
            uploadedContent.value = content;
            textInput.value = content;
            document.getElementById('uploadPreview').style.display = 'block';
            showMessage(`✅ Đã đọc file: ${file.name} (${content.length} ký tự)`, 'success');
        } catch (error) {
            showMessage('❌ Lỗi khi đọc file: ' + error.message, 'error');
        }
    };

    reader.onerror = function () {
        showMessage('❌ Không thể đọc file. Vui lòng thử lại.', 'error');
    };

    reader.readAsText(file, 'UTF-8');
});

// Normalize text (remove carriage returns)
function normalizeText(value) {
    return value.replace(/\r/g, '');
}

// Get source text from active tab
function getSourceText() {
    const uploadTab = document.getElementById('upload');
    const manualTab = document.getElementById('manual');

    if (uploadTab.classList.contains('active') && uploadedContent.value) {
        return uploadedContent.value;
    }
    return textInput.value;
}

// Parse keywords from input
function parseKeywords() {
    const type = filterType.value;

    if (type === 'multiple') {
        const raw = keywordList.value
            .split(/[\n,;|]/)
            .map(item => item.trim())
            .filter(item => item.length > 0);
        return raw;
    }

    const keyword = keywordInput.value.trim();
    return keyword ? [keyword] : [];
}

// Check if line matches pattern
function matchesPattern(line, pattern, type, caseSensitiveFlag = false) {
    let source = line;
    let target = pattern;

    // Apply case sensitivity
    if (!caseSensitiveFlag) {
        source = source.toLowerCase();
        target = target.toLowerCase();
    }

    switch (type) {
        case 'contains':
            return source.includes(target);

        case 'startswith':
            return source.startsWith(target);

        case 'endswith':
            return source.endsWith(target);

        case 'exact':
            return source === target;

        case 'regex':
            try {
                const flags = caseSensitiveFlag ? 'g' : 'gi';
                const regex = new RegExp(target, flags);
                return regex.test(line);
            } catch (error) {
                console.error('Regex error:', error);
                return false;
            }

        default:
            return source.includes(target);
    }
}

// Check multiple keywords
function checkMultipleKeywords(line, keywords, mode, caseSensitiveFlag) {
    if (keywords.length === 0) return false;

    const normalizedLine = caseSensitiveFlag ? line : line.toLowerCase();
    const normalizedKeywords = keywords.map(kw => 
        caseSensitiveFlag ? kw : kw.toLowerCase()
    );

    if (mode === 'all') {
        // Match ALL keywords
        return normalizedKeywords.every(keyword => normalizedLine.includes(keyword));
    } else {
        // Match ANY keyword
        return normalizedKeywords.some(keyword => normalizedLine.includes(keyword));
    }
}

// Apply filter
function applyFilter() {
    const sourceText = normalizeText(getSourceText());

    if (!sourceText.trim()) {
        resultOutput.value = '';
        totalLinesEl.textContent = '0';
        matchedLinesEl.textContent = '0';
        percentageEl.textContent = '0%';
        showMessage('❌ Không có dữ liệu để lọc. Vui lòng nhập hoặc tải file.', 'error');
        return;
    }

    const lines = sourceText.split('\n');
    const type = filterType.value;
    const invert = invertFilter.checked;
    const removeBlank = removeEmpty.checked;

    let filtered = [];
    let processedLines = lines;

    // Remove blank lines if needed
    if (removeBlank) {
        processedLines = lines.filter(line => line.trim().length > 0);
    }

    // Apply filter
    for (const line of processedLines) {
        const trimmed = line.trim();

        let matched = false;

        if (type === 'multiple') {
            const keywords = parseKeywords();
            if (keywords.length === 0) {
                showMessage('❌ Vui lòng nhập ít nhất một từ khóa.', 'error');
                return;
            }
            const mode = document.querySelector('input[name="multipleMode"]:checked').value;
            matched = checkMultipleKeywords(line, keywords, mode, caseSensitive.checked);
        } else {
            const keyword = keywordInput.value.trim();

            if (!keyword) {
                showMessage('❌ Vui lòng nhập từ khóa để lọc.', 'error');
                return;
            }

            matched = matchesPattern(line, keyword, type, caseSensitive.checked);
        }

        // Invert filter if needed
        if (invert) {
            matched = !matched;
        }

        if (matched) {
            filtered.push(line);
        }
    }

    // Display results
    const finalText = filtered.join('\n');
    resultOutput.value = finalText;

    // Calculate statistics
    const total = processedLines.length;
    const matchedCount = filtered.length;
    const percent = total > 0 ? ((matchedCount / total) * 100).toFixed(1) : 0;

    totalLinesEl.textContent = total;
    matchedLinesEl.textContent = matchedCount;
    percentageEl.textContent = `${percent}%`;

    // Show success message
    const messageText = invert 
        ? `✅ Đã lọc: ${matchedCount}/${total} dòng được loại trừ (${percent}%)`
        : `✅ Đã lọc: ${matchedCount}/${total} dòng phù hợp (${percent}%)`;
    showMessage(messageText, 'success');

    // Switch to results tab
    switchToResults();
}

// Switch to results tab
function switchToResults() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    const resultsBtnIndex = 2; // Results is the 3rd tab
    document.querySelectorAll('.tab-btn')[resultsBtnIndex].classList.add('active');
    document.getElementById('results').classList.add('active');
}

// Clear all data
function clearAll() {
    textInput.value = '';
    uploadedContent.value = '';
    resultOutput.value = '';
    fileInput.value = '';
    keywordInput.value = '';
    keywordList.value = '';
    currentText = '';
    totalLinesEl.textContent = '0';
    matchedLinesEl.textContent = '0';
    percentageEl.textContent = '0%';
    document.getElementById('uploadPreview').style.display = 'none';
    hideMessage();
    
    // Reset filters
    filterType.value = 'contains';
    caseSensitive.checked = false;
    invertFilter.checked = false;
    removeEmpty.checked = true;
    updateFilterUI();
    
    showMessage('🗑️ Đã xóa tất cả dữ liệu', 'info');
}

// Copy to clipboard
function copyToClipboard() {
    const text = resultOutput.value;
    if (!text.trim()) {
        showMessage('❌ Không có nội dung để sao chép.', 'error');
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => {
            showMessage('✅ Đã sao chép ' + text.split('\n').length + ' dòng vào bộ nhớ tạm.', 'success');
        })
        .catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showMessage('✅ Đã sao chép vào bộ nhớ tạm.', 'success');
        });
}

// Download result as file
function downloadResult() {
    const text = resultOutput.value;
    if (!text.trim()) {
        showMessage('❌ Không có nội dung để tải xuống.', 'error');
        return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `filtered_result_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage(`⬇️ Đã tải xuống file (${text.split('\n').length} dòng)`, 'success');
}

// Print result
function printResult() {
    const text = resultOutput.value;
    if (!text.trim()) {
        showMessage('❌ Không có nội dung để in.', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    const lines = text.split('\n').length;
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <title>Kết quả lọc</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        white-space: pre-wrap; 
                        word-wrap: break-word;
                        margin: 20px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        font-weight: bold;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                    }
                    .content {
                        border: 1px solid #ccc;
                        padding: 10px;
                        background: #f9f9f9;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    Kết quả lọc - ${new Date().toLocaleString('vi-VN')}<br>
                    Tổng cộng: ${lines} dòng
                </div>
                <div class="content">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter: Apply filter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        applyFilter();
    }
    // Ctrl/Cmd + Shift + C: Copy result
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        copyToClipboard();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateFilterUI();
    
    // Enable Enter key in keyword inputs
    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            applyFilter();
        }
    });
});

// Auto-update stats when result changes
resultOutput.addEventListener('input', function() {
    const lines = this.value.split('\n').filter(l => l.trim().length > 0).length;
    matchedLinesEl.textContent = lines;
});
