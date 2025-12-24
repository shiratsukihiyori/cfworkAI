// 创建弹窗容器
function createMarshmallowNotice() {
    // 如果已经存在弹窗，则不再创建
    if (document.getElementById('marshmallow-notice')) return;

    // 创建弹窗元素
    const notice = document.createElement('div');
    notice.id = 'marshmallow-notice';
    notice.className = 'marshmallow-notice';
    notice.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 10px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        border: 1px solid #e0e0e0;
    `;

    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
        padding: 0 5px;
    `;
    closeBtn.onclick = () => notice.remove();

    // 创建内容容器
    const content = document.createElement('div');
    content.style.marginBottom = '10px';

    // 添加多语言消息
    const messages = {
        'zh': '如果遇到问题请投棉花糖哦！',
        'zh-TW': '如果遇到問題請投棉花糖哦！',
        'ja': '質問がある場合はマシュマロでお知らせください！',
        'en': 'If you have any questions, please send us a marshmallow!'
    };

    // 获取页面语言设置
    const pageLang = document.documentElement.lang || 'zh-CN';
    let displayLang = 'en'; // 默认英语

    // 根据页面语言选择最接近的选项
    if (pageLang.startsWith('zh')) {
        displayLang = pageLang.includes('TW') || pageLang.includes('HK') ? 'zh-TW' : 'zh';
    } else if (pageLang.startsWith('ja')) {
        displayLang = 'ja';
    }

    // 设置消息内容
    content.textContent = messages[displayLang] || messages['en'];

    // 创建链接按钮
    const link = document.createElement('a');
    link.href = 'https://marshmallow-qa.com/f9nava8c2dh71k1';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = displayLang === 'en' ? 'Feedback' : 
                      displayLang === 'ja' ? 'フィードバック' : '去反馈';
    link.style.cssText = `
        display: inline-block;
        background: #FF6B9D;
        color: white;
        padding: 5px 15px;
        border-radius: 5px;
        text-decoration: none;
        font-weight: 500;
        transition: background 0.2s;
    `;
    link.onmouseover = () => link.style.background = '#ff4d8d';
    link.onmouseout = () => link.style.background = '#FF6B9D';

    // 组装元素
    notice.appendChild(closeBtn);
    notice.appendChild(content);
    notice.appendChild(document.createElement('br'));
    notice.appendChild(link);

    // 添加到页面
    document.body.appendChild(notice);

    // 用户手动关闭，不自动消失
}

// 页面加载完成后显示弹窗
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createMarshmallowNotice);
} else {
    createMarshmallowNotice();
}
