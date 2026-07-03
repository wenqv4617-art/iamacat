(function() {
  // 1. 闭包范围内的局部变量和宿主 API 引用
  let containerEl = null;
  let rocheApi = null;
  
  // 2. 游戏全局状态
  let state = {
    activeTab: 'explore', // 'explore' | 'harass' | 'profile'
    activePersonaId: '',  // 宿主当前的活动面具 ID
    profile: {
      activePersonaId: '',
      color: '奶牛猫',
      breed: '中华田园猫',
      specialty: '钻纸箱',
      charm: 80,
      energy: 100,
      satiety: 100,
      mischief: 0
    },
    currentChatChar: null, // 正在骚扰的角色
    npcChat: null,         // 临时路人 NPC 会话
    feed: [],              // 探索信息流
    encounter: null        // 偶遇卡片状态 { scenario: '', history: [], loading: false }
  };

  function getDefaultProfile(personaId) {
    return {
      activePersonaId: personaId,
      color: '奶牛猫',
      breed: '中华田园猫',
      specialty: '钻纸箱',
      charm: 80,
      energy: 100,
      satiety: 100,
      mischief: 0
    };
  }

  // --- 核心方法：状态管理与数据加载（基于当前面具随动加载） ---
  async function loadState(personaId) {
    let targetPersonaId = personaId;
    if (!targetPersonaId) {
      try {
        const activeUser = await rocheApi.persona.getActiveUserPersona();
        targetPersonaId = activeUser?.id || 'default_persona';
      } catch (e) {
        targetPersonaId = 'default_persona';
      }
    }

    state.activePersonaId = targetPersonaId;

    try {
      // 随动读取该面具对应的独立设定和状态
      const savedProfile = await rocheApi.storage.get(`cat_profile_${targetPersonaId}`);
      if (savedProfile) {
        state.profile = { ...getDefaultProfile(targetPersonaId), ...savedProfile };
      } else {
        state.profile = getDefaultProfile(targetPersonaId);
      }
      
      // 同步绑定人设
      state.profile.activePersonaId = targetPersonaId;

      const savedFeed = await rocheApi.storage.get("cat_feed");
      if (savedFeed) {
        state.feed = savedFeed;
      }
    } catch (e) {
      console.error("加载猫咪存档失败:", e);
    }
  }

  async function saveProfile() {
    try {
      const personaId = state.activePersonaId || 'default_persona';
      await rocheApi.storage.set(`cat_profile_${personaId}`, state.profile);
    } catch (e) {
      console.error("保存猫咪存档失败:", e);
    }
  }

  // --- 核心方法：样式管理（浅薄荷绿与柔和粉配色） ---
  function insertStyles() {
    if (document.getElementById('roche-plugin-iamacat-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'roche-plugin-iamacat-styles';
    styleEl.innerHTML = `
      .roche-plugin-iamacat {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: #f4faf7; /* 浅薄荷绿背景 */
        color: #3d4a46; /* 暗灰色，比纯黑更温和 */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        position: relative;
      }
      .roche-plugin-iamacat * {
        box-sizing: border-box;
      }
      .roche-plugin-iamacat .cat-header {
        height: 48px;
        border-bottom: 1px solid #e1efe9;
        background-color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        flex-shrink: 0;
      }
      .roche-plugin-iamacat .header-title {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.2px;
      }
      
      /* 正在沉思的呼吸灯动画 */
      @keyframes thinkingPulse {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
      .roche-plugin-iamacat .thinking-pulse {
        animation: thinkingPulse 1.5s infinite ease-in-out;
        color: #e29295;
      }

      .roche-plugin-iamacat .header-left, 
      .roche-plugin-iamacat .header-right {
        width: 36px;
        display: flex;
        align-items: center;
      }
      .roche-plugin-iamacat .header-right {
        justify-content: flex-end;
      }
      .roche-plugin-iamacat .icon-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: #3d4a46;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .roche-plugin-iamacat .icon-btn:hover {
        opacity: 0.7;
      }
      .roche-plugin-iamacat .cat-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      .roche-plugin-iamacat .cat-navbar {
        height: 56px;
        border-top: 1px solid #e1efe9;
        background-color: #ffffff;
        display: flex;
        justify-content: space-around;
        align-items: center;
        flex-shrink: 0;
      }
      .roche-plugin-iamacat .nav-item {
        background: none;
        border: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #92a8a1;
        font-size: 11px;
        gap: 3px;
        cursor: pointer;
        transition: color 0.15s ease;
        padding: 6px 0;
        flex: 1;
      }
      .roche-plugin-iamacat .nav-item.active {
        color: #76c3ab; /* 激活态为薄荷绿 */
      }
      .roche-plugin-iamacat .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .roche-plugin-iamacat .section-title {
        font-size: 13px;
        font-weight: 600;
        color: #3d4a46;
        border-left: 3px solid #e29295; /* 粉色指示线 */
        padding-left: 8px;
        letter-spacing: 0.5px;
      }
      .roche-plugin-iamacat .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .roche-plugin-iamacat .stat-card {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .roche-plugin-iamacat .stat-label {
        font-size: 11px;
        color: #92a8a1;
      }
      .roche-plugin-iamacat .stat-value {
        font-size: 15px;
        font-weight: 600;
      }
      .roche-plugin-iamacat .stat-bar-bg {
        height: 4px;
        background-color: #f1f8f5;
        border-radius: 2px;
        overflow: hidden;
      }
      .roche-plugin-iamacat .stat-bar-fill {
        height: 100%;
        background-color: #e29295; /* 进度填充浅粉 */
        transition: width 0.3s ease;
      }
      .roche-plugin-iamacat .profile-form {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .roche-plugin-iamacat .avatar-selector-row {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
      }
      .roche-plugin-iamacat .user-avatar-frame {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
        border: 1px solid #e1efe9;
        background-color: #f1f8f5;
        flex-shrink: 0;
      }
      .roche-plugin-iamacat .user-avatar-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .roche-plugin-iamacat .user-avatar-placeholder {
        width: 100%;
        height: 100%;
        background-color: #dbe8e2;
      }
      .roche-plugin-iamacat .form-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }
      .roche-plugin-iamacat .form-row label {
        font-size: 11px;
        font-weight: 500;
        color: #92a8a1;
      }
      .roche-plugin-iamacat .form-input {
        border: 1px solid #cce3da;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 13px;
        outline: none;
        background-color: #fafdfc;
        color: #3d4a46;
        transition: border-color 0.2s;
        width: 100%;
      }
      .roche-plugin-iamacat .form-input:focus {
        border-color: #76c3ab;
      }
      .roche-plugin-iamacat .btn-primary {
        background-color: #e29295; /* 按钮主体粉色 */
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 10px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
        width: 100%;
      }
      .roche-plugin-iamacat .btn-primary:hover {
        opacity: 0.9;
      }
      .roche-plugin-iamacat .char-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .roche-plugin-iamacat .char-card {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .roche-plugin-iamacat .char-card:hover {
        background-color: #fbfdfc;
      }
      .roche-plugin-iamacat .char-avatar-container {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid #e1efe9;
        background-color: #f1f8f5;
      }
      .roche-plugin-iamacat .char-avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .roche-plugin-iamacat .char-avatar-placeholder {
        width: 100%;
        height: 100%;
        background-color: #dbe8e2;
      }
      .roche-plugin-iamacat .char-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .roche-plugin-iamacat .char-display-name {
        font-size: 13px;
        font-weight: 600;
      }
      .roche-plugin-iamacat .char-last-msg {
        font-size: 11px;
        color: #92a8a1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .roche-plugin-iamacat .actions-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .roche-plugin-iamacat .action-card {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .roche-plugin-iamacat .action-card-complex {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .roche-plugin-iamacat .action-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .roche-plugin-iamacat .action-name {
        font-size: 13px;
        font-weight: 600;
      }
      .roche-plugin-iamacat .action-desc {
        font-size: 11px;
        color: #92a8a1;
      }
      .roche-plugin-iamacat .btn-action {
        background-color: transparent;
        border: 1px solid #76c3ab; /* 动作按钮薄荷绿 */
        color: #76c3ab;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s, color 0.2s;
        white-space: nowrap;
      }
      .roche-plugin-iamacat .btn-action:hover {
        background-color: #76c3ab;
        color: #ffffff;
      }
      .roche-plugin-iamacat .sleep-form {
        display: flex;
        width: 100%;
        gap: 8px;
      }
      .roche-plugin-iamacat .feed-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .roche-plugin-iamacat .feed-item {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .roche-plugin-iamacat .feed-author {
        font-size: 12px;
        font-weight: 600;
      }
      .roche-plugin-iamacat .feed-content {
        font-size: 12px;
        line-height: 1.4;
        color: #4a5451;
      }
      .roche-plugin-iamacat .loading-placeholder,
      .roche-plugin-iamacat .empty-placeholder {
        font-size: 11px;
        color: #92a8a1;
        text-align: center;
        padding: 24px 12px;
      }
      
      /* 骚扰对话框整体尺寸扩展 */
      .roche-plugin-iamacat .chat-subpage {
        display: flex;
        flex-direction: column;
        height: calc(100% + 32px); /* 冲破父级 16px 边距，贴合底部边缘 */
        margin: -16px;
        position: relative;
      }
      .roche-plugin-iamacat .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px 16px 80px 16px; /* 底部安全留白 */
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .roche-plugin-iamacat .chat-bubble-row {
        display: flex;
        width: 100%;
      }
      .roche-plugin-iamacat .chat-bubble-row.me {
        justify-content: flex-end;
      }
      .roche-plugin-iamacat .chat-bubble-row.them {
        justify-content: flex-start;
      }
      .roche-plugin-iamacat .chat-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.4;
        cursor: pointer;
        transition: transform 0.1s ease;
      }
      .roche-plugin-iamacat .chat-bubble:hover {
        transform: scale(1.01);
      }
      .roche-plugin-iamacat .chat-bubble-row.me .chat-bubble {
        background-color: #fbe9eb; /* 猫咪发言用淡粉气泡 */
        color: #3d4a46;
        border: 1px solid #f3dbde;
        border-bottom-right-radius: 4px;
      }
      .roche-plugin-iamacat .chat-bubble-row.them .chat-bubble {
        background-color: #ffffff;
        color: #3d4a46;
        border: 1px solid #e1efe9; /* 对方用白色带薄荷绿描边 */
        border-bottom-left-radius: 4px;
      }
      .roche-plugin-iamacat .chat-bubble-row.typing .chat-bubble {
        color: #92a8a1;
        font-style: italic;
      }
      
      /* 极简纯悬浮聊天框设计 */
      .roche-plugin-iamacat .chat-input-bar {
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        display: flex;
        gap: 8px;
        background-color: transparent;
        border-top: none;
        padding: 0;
        flex-shrink: 0;
        z-index: 10;
      }
      .roche-plugin-iamacat .chat-input-bar .form-input {
        background-color: #ffffff;
        border: 1px solid #cce3da;
        border-radius: 20px; /* 优雅的胶囊圆角 */
        padding: 10px 16px;
        box-shadow: 0 3px 10px rgba(118, 195, 171, 0.15); /* 独立悬浮阴影 */
      }
      .roche-plugin-iamacat .chat-input-bar .btn-primary {
        width: auto;
        padding: 10px 20px;
        border-radius: 20px; /* 药丸圆形发送按钮 */
        box-shadow: 0 3px 10px rgba(226, 146, 149, 0.3); /* 独立悬浮粉色按钮阴影 */
      }
      
      /* 偶遇遮罩层与卡片 */
      .roche-plugin-iamacat .modal-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(61, 74, 70, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        z-index: 1000;
      }
      .roche-plugin-iamacat .encounter-card {
        background-color: #ffffff;
        border: 1px solid #e1efe9;
        border-radius: 12px;
        padding: 20px;
        width: 100%;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(118, 195, 171, 0.15);
      }
      .roche-plugin-iamacat .encounter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f8f5;
        padding-bottom: 8px;
      }
      .roche-plugin-iamacat .encounter-title-text {
        font-size: 14px;
        font-weight: 600;
        color: #3d4a46;
        letter-spacing: 0.5px;
      }
      
      /* 偶遇多轮历史流微型列表 */
      .roche-plugin-iamacat .encounter-history-list {
        max-height: 180px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border: 1px solid #e1efe9;
        padding: 8px;
        border-radius: 6px;
        background: #fbfdfc;
      }
      .roche-plugin-iamacat .history-item {
        font-size: 11.5px;
        line-height: 1.4;
        padding: 4px 8px;
        border-radius: 4px;
        max-width: 85%;
      }
      .roche-plugin-iamacat .history-item.scenario-start {
        background: #f1f8f5;
        color: #648c7f;
        font-weight: 500;
        max-width: 100%;
      }
      .roche-plugin-iamacat .history-item.user-act {
        background: #fbe9eb;
        color: #b06567;
        align-self: flex-end;
        text-align: right;
      }
      .roche-plugin-iamacat .history-item.npc-react {
        background: #ffffff;
        color: #4a5451;
        align-self: flex-start;
        border: 1px solid #e1efe9;
      }
      
      .roche-plugin-iamacat .encounter-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // --- 核心方法：页面渲染 ---
  function render() {
    if (!containerEl) return;
    
    // 判断当前是否处于聊天骚扰模式（如果是，完全隐藏底部的 Dock 导航栏）
    const isChatting = state.currentChatChar !== null || state.npcChat !== null;
    
    containerEl.innerHTML = `
      <div class="roche-plugin-iamacat">
        <header class="cat-header">
          <div class="header-left" id="header-back-btn"></div>
          <div class="header-title" id="header-title-text">我是猫</div>
          <div class="header-right" id="header-action-btn"></div>
        </header>
        <div class="cat-body" id="cat-body-content"></div>
        ${!isChatting ? `
        <nav class="cat-navbar">
          <button class="nav-item ${state.activeTab === 'explore' ? 'active' : ''}" id="nav-btn-explore">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
            <span>探索</span>
          </button>
          <button class="nav-item ${state.activeTab === 'harass' ? 'active' : ''}" id="nav-btn-harass">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>骚扰</span>
          </button>
          <button class="nav-item ${state.activeTab === 'profile' ? 'active' : ''}" id="nav-btn-profile">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>我的</span>
          </button>
        </nav>
        ` : ''}
      </div>
    `;
    
    // 非聊天状态下才需要给导航栏绑定事件
    if (!isChatting) {
      containerEl.querySelector('#nav-btn-explore').onclick = () => {
        state.activeTab = 'explore';
        render();
      };
      containerEl.querySelector('#nav-btn-harass').onclick = () => {
        state.activeTab = 'harass';
        render();
      };
      containerEl.querySelector('#nav-btn-profile').onclick = () => {
        state.activeTab = 'profile';
        render();
      };
    }
    
    renderBody();
    
    // 如果路人卡片偶遇处于激活状态，随时在顶层渲染遮罩卡片
    renderEncounterModal();
  }

  // --- 核心方法：子页面路由分发 ---
  async function renderBody() {
    const bodyEl = containerEl.querySelector('#cat-body-content');
    const headerTitle = containerEl.querySelector('#header-title-text');
    const headerBack = containerEl.querySelector('#header-back-btn');
    const headerAction = containerEl.querySelector('#header-action-btn');
    
    headerBack.innerHTML = '';
    headerAction.innerHTML = '';
    
    const isChatting = state.currentChatChar !== null || state.npcChat !== null;
    
    // 管理 header 左侧返回和退出功能
    if (isChatting) {
      // 聊天页展示“返回列表”按钮
      headerBack.innerHTML = `
        <button class="icon-btn" id="chat-back-btn" title="返回列表">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      `;
      headerBack.querySelector('#chat-back-btn').onclick = () => {
        state.currentChatChar = null;
        state.npcChat = null;
        render();
      };
    } else {
      // 首页展示“退出应用/返回主页面”按钮 (极简 X 图标)
      headerBack.innerHTML = `
        <button class="icon-btn" id="close-app-btn" title="返回主界面">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      headerBack.querySelector('#close-app-btn').onclick = () => {
        rocheApi.ui.closeApp();
      };
    }
    
    if (state.activeTab === 'profile') {
      headerTitle.innerText = '猫咪资料';
      renderProfileTab(bodyEl);
    } else if (state.activeTab === 'harass') {
      if (state.currentChatChar) {
        headerTitle.innerText = `${state.currentChatChar.handle || state.currentChatChar.name}`;
        renderChatSubpage(bodyEl, headerBack, headerAction, false);
      } else if (state.npcChat) {
        headerTitle.innerText = `${state.npcChat.npc.name}`;
        renderChatSubpage(bodyEl, headerBack, headerAction, true);
      } else {
        headerTitle.innerText = '选择居民';
        renderHarassTab(bodyEl);
      }
    } else if (state.activeTab === 'explore') {
      headerTitle.innerText = '小街探索';
      renderExploreTab(bodyEl, headerAction);
    }
  }

  // --- 模块 1：“我的” 页面设计 ---
  async function renderProfileTab(bodyEl) {
    let personas = [];
    try {
      personas = await rocheApi.persona.getUserPersonas() || [];
    } catch (e) {
      console.warn("读取宿主人设失败:", e);
    }

    const optionsHtml = personas.map(p => 
      `<option value="${p.id}" ${state.activePersonaId === p.id ? 'selected' : ''}>${p.name || p.handle || '未命名人设'}</option>`
    ).join('');
    
    // 计算当前绑定的头像
    const activePersona = personas.find(p => p.id === state.activePersonaId) || personas[0];
    const initialAvatar = activePersona?.avatar || '';

    bodyEl.innerHTML = `
      <div class="tab-content profile-tab">
        <div class="section-title">我的状态</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">体力</div>
            <div class="stat-value">${state.profile.energy.toFixed(1)}/100</div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${state.profile.energy}%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">饱腹</div>
            <div class="stat-value">${state.profile.satiety.toFixed(1)}/100</div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${state.profile.satiety}%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">魅力</div>
            <div class="stat-value">${state.profile.charm}/100</div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${state.profile.charm}%"></div></div>
          </div>
          <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="stat-label">淘气度</div>
              <div class="stat-value" style="color: #e29295; font-size: 18px; margin-top: 2px;">${state.profile.mischief}</div>
            </div>
            <div style="font-size: 10px; color: #92a8a1; margin-top: 4px; font-weight: 500;">∞ 无上限成长中</div>
          </div>
        </div>
        
        <div class="section-title" style="margin-top: 12px;">猫咪设定</div>
        <form class="profile-form" id="cat-profile-form">
          <div class="form-row">
            <label>切换/绑定宿主人设及头像</label>
            <div class="avatar-selector-row">
              <div class="user-avatar-frame" id="user-avatar-preview">
                ${initialAvatar ? `<img src="${initialAvatar}" />` : `<div class="user-avatar-placeholder"></div>`}
              </div>
              <select id="profile-active-persona" class="form-input" style="flex: 1;">
                <option value="">请选择绑定人设</option>
                ${optionsHtml}
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>花色</label>
            <input type="text" id="profile-color" class="form-input" value="${state.profile.color || ''}" placeholder="例如：奶牛猫">
          </div>
          <div class="form-row">
            <label>种族</label>
            <input type="text" id="profile-breed" class="form-input" value="${state.profile.breed || ''}" placeholder="例如：中华田园猫">
          </div>
          <div class="form-row">
            <label>特长</label>
            <input type="text" id="profile-specialty" class="form-input" value="${state.profile.specialty || ''}" placeholder="例如：特长捣蛋">
          </div>
          <div class="form-row">
            <label>魅力值 (0-100)</label>
            <input type="number" id="profile-charm" class="form-input" min="0" max="100" value="${state.profile.charm}">
          </div>
          <button type="submit" class="btn-primary" style="margin-top: 10px;">更新猫咪设定</button>
        </form>
      </div>
    `;
    
    // 头像选择联动逻辑（满足随动切换面具特性）
    const selector = bodyEl.querySelector('#profile-active-persona');
    const avatarPreview = bodyEl.querySelector('#user-avatar-preview');
    
    selector.onchange = async () => {
      const selectedId = selector.value || 'default_persona';
      // 随动读取对应的面具资料与猫咪属性
      await loadState(selectedId);
      render();
    };

    bodyEl.querySelector('#cat-profile-form').onsubmit = async (e) => {
      e.preventDefault();
      const color = bodyEl.querySelector('#profile-color').value.trim();
      const breed = bodyEl.querySelector('#profile-breed').value.trim();
      const specialty = bodyEl.querySelector('#profile-specialty').value.trim();
      const charm = parseInt(bodyEl.querySelector('#profile-charm').value, 10) || 0;
      const personaId = selector.value || 'default_persona';
      
      state.profile.color = color || "神秘花色";
      state.profile.breed = breed || "猫咪族";
      state.profile.specialty = specialty || "擅长睡觉";
      state.profile.charm = Math.max(0, Math.min(100, charm));
      state.profile.activePersonaId = personaId;
      state.activePersonaId = personaId;
      
      await saveProfile();
      rocheApi.ui.toast("猫咪设定修改并存档成功喵。");
      render();
    };
  }

  // --- 模块 2：“骚扰” 列表 ---
  async function renderHarassTab(bodyEl) {
    bodyEl.innerHTML = `
      <div class="tab-content harass-tab">
        <div class="section-title">街区居民</div>
        <div class="char-list" id="harass-char-list">
          <div class="loading-placeholder">正在感应附近的居民...</div>
        </div>
      </div>
    `;
    
    try {
      const chars = await rocheApi.character.list() || [];
      const listEl = bodyEl.querySelector('#harass-char-list');
      
      if (chars.length === 0) {
        listEl.innerHTML = `<div class="empty-placeholder">周围空无一人。请先在 Roche 宿主中添加或者绑定一些角色。</div>`;
        return;
      }
      
      listEl.innerHTML = '';
      
      for (const char of chars) {
        const charCard = document.createElement('div');
        charCard.className = 'char-card';
        const name = char.handle || char.name || '居民';
        
        charCard.innerHTML = `
          <div class="char-avatar-container">
            ${char.avatar ? `<img src="${char.avatar}" class="char-avatar" />` : `<div class="char-avatar-placeholder"></div>`}
          </div>
          <div class="char-info">
            <span class="char-display-name">${name}</span>
            <span class="char-last-msg" id="last-msg-${char.id}">正在读取上一条叫声...</span>
          </div>
        `;
        
        charCard.onclick = () => {
          state.currentChatChar = char;
          render();
        };
        
        listEl.appendChild(charCard);
        fetchLastMsg(char);
      }
    } catch (e) {
      console.error(e);
      bodyEl.querySelector('#harass-char-list').innerHTML = `<div class="empty-placeholder">感应居民失败，请重试。</div>`;
    }
  }

  // 改进：异步加载本面具专属聊天记录的最后一条作为预览
  async function fetchLastMsg(char) {
    try {
      const personaId = state.activePersonaId || 'default_persona';
      const chatKey = `cat_chat_${personaId}_${char.id}`;
      const chatHistory = await rocheApi.storage.get(chatKey) || [];
      const placeholder = document.getElementById(`last-msg-${char.id}`);
      
      if (placeholder) {
        if (chatHistory && chatHistory.length > 0) {
          const lastMsgObj = chatHistory[chatHistory.length - 1];
          let text = lastMsgObj.text || '';
          placeholder.innerText = text.length > 15 ? text.slice(0, 15) + '...' : text;
        } else {
          placeholder.innerText = '还没对它进行过骚扰。';
        }
      }
    } catch (e) {
      const placeholder = document.getElementById(`last-msg-${char.id}`);
      if (placeholder) placeholder.innerText = '还没对它进行过骚扰。';
    }
  }

  // --- 模块 3：“探索” 页面设计 ---
  async function renderExploreTab(bodyEl, headerAction) {
    headerAction.innerHTML = `
      <button class="icon-btn" id="explore-refresh-btn" title="打探猫咪圈">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
      </button>
    `;
    headerAction.querySelector('#explore-refresh-btn').onclick = () => {
      refreshFeed();
    };
    
    let chars = [];
    try {
      chars = await rocheApi.character.list() || [];
    } catch (e) {}
    
    const charOptions = chars.map(c => `<option value="${c.id}">${c.handle || c.name}</option>`).join('');
    
    bodyEl.innerHTML = `
      <div class="tab-content explore-tab">
        <div class="section-title">猫咪日常活动</div>
        <div class="actions-container">
          <!-- 进食 -->
          <div class="action-card">
            <div class="action-meta">
              <span class="action-name">享用小鱼干</span>
              <span class="action-desc">体力不消耗，饱腹值恢复 30</span>
            </div>
            <button class="btn-action" id="action-eat-btn">进食</button>
          </div>
          
          <!-- 睡觉 -->
          <div class="action-card-complex">
            <div class="action-meta">
              <span class="action-name">寻找睡眠地点</span>
              <span class="action-desc">打盹休息以恢复精力体力</span>
            </div>
            <div class="sleep-form">
              <select id="sleep-location-select" class="form-input" style="flex: 1; min-width: 0;">
                <option value="park">公园里 (体力 +10)</option>
                <option value="street">暖洋洋街边 (体力 +15)</option>
                ${chars.length > 0 ? `<option value="char-home">到居民家里借宿 (体力回满 / 需判定)</option>` : ''}
              </select>
              ${chars.length > 0 ? `
              <select id="sleep-char-select" class="form-input" style="flex: 1; min-width: 0; display: none;">
                ${charOptions}
              </select>
              ` : ''}
              <button class="btn-action" id="action-sleep-btn">睡觉</button>
            </div>
          </div>
          
          <!-- 偶遇路人 -->
          <div class="action-card">
            <div class="action-meta">
              <span class="action-name">偶遇幸运路人</span>
              <span class="action-desc">随机触发路人行为场景，在卡片中采取行动</span>
            </div>
            <button class="btn-action" id="action-npc-btn">去偶遇</button>
          </div>
        </div>
        
        <div class="section-title" style="margin-top: 12px;">猫咪圈动态</div>
        <div class="feed-list" id="explore-feed-list">
          <div class="loading-placeholder">点击右上角图标，向过路猫咪打探动态消息...</div>
        </div>
      </div>
    `;
    
    const locSelect = bodyEl.querySelector('#sleep-location-select');
    const charSelect = bodyEl.querySelector('#sleep-char-select');
    if (locSelect && charSelect) {
      locSelect.onchange = () => {
        if (locSelect.value === 'char-home') {
          charSelect.style.display = 'block';
        } else {
          charSelect.style.display = 'none';
        }
      };
    }
    
    bodyEl.querySelector('#action-eat-btn').onclick = () => {
      state.profile.satiety = Math.min(100, state.profile.satiety + 30);
      saveProfile();
      rocheApi.ui.toast("小鱼干真美味，饱腹感提升了。");
      render();
    };
    
    bodyEl.querySelector('#action-sleep-btn').onclick = async () => {
      const loc = locSelect.value;
      if (loc === 'park') {
        state.profile.energy = Math.min(100, state.profile.energy + 10);
        saveProfile();
        rocheApi.ui.toast("在公园长椅上打个盹，恢复了些体力。");
        render();
      } else if (loc === 'street') {
        state.profile.energy = Math.min(100, state.profile.energy + 15);
        saveProfile();
        rocheApi.ui.toast("暖呼呼的马路水泥地实在太舒服了，体力恢复。");
        render();
      } else if (loc === 'char-home') {
        const targetCharId = charSelect.value;
        const targetChar = chars.find(c => c.id === targetCharId);
        if (targetChar) {
          await requestSleepAtCharHome(targetChar);
        }
      }
    };
    
    bodyEl.querySelector('#action-npc-btn').onclick = () => {
      triggerNPCOncounter();
    };
    
    renderFeedList(bodyEl.querySelector('#explore-feed-list'));
  }

  function renderFeedList(feedListEl) {
    if (!feedListEl) return;
    if (!state.feed || state.feed.length === 0) {
      feedListEl.innerHTML = `<div class="empty-placeholder">周围平静极了，点击右上角打探猫群最新的动作动态。</div>`;
      return;
    }
    
    feedListEl.innerHTML = '';
    state.feed.forEach(item => {
      const feedItem = document.createElement('div');
      feedItem.className = 'feed-item';
      feedItem.innerHTML = `
        <div class="feed-header">
          <span class="feed-author">${item.sender}</span>
        </div>
        <div class="feed-content">${item.text}</div>
      `;
      feedListEl.appendChild(feedItem);
    });
  }

  // --- 核心方法：AI 生成猫咪社交信息流 ---
  async function refreshFeed() {
    rocheApi.ui.toast("正在向附近的流浪猫打探风声...");
    let chars = [];
    try {
      chars = await rocheApi.character.list() || [];
    } catch (e) {}
    
    const charNames = chars.map(c => c.handle || c.name).slice(0, 5).join("、");
    const systemPrompt = `你是一个猫咪社区日常状态生成器。我们需要为“猫咪社交群”生成 4 条无 Emoji 的极简文字动态。
周围已知的人类居民有：${charNames || "神秘两脚兽"}。
玩家猫咪的详情：
- 花色：${state.profile.color}
- 种族：${state.profile.breed}
- 特长：${state.profile.specialty}

规则：
1. 请生成 4 条动态。
2. 动态类型：一些来自于其他路人猫（必须用“咪”作为第一人称，符合猫咪可爱但冷傲的口吻）；另一些来自于被这只玩家猫咪（描述其花色或特长）抓过、骚扰过或偷过鱼干的人类居民（疯狂吐槽这只猫）。
3. 动态文字必须简短，每条控制在 35 字以内。
4. 千万不要使用任何 emoji 图标，用极简的排版和符号即可。
5. 必须返回可直接解析的标准的 JSON 数组格式（不要包含 markdown \`\`\`json 标记）：
[
  { "sender": "角色或猫咪名", "text": "动态具体文字内容" }
]`;

    try {
      const res = await rocheApi.ai.chat({
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.8
      });
      let cleanText = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        state.feed = parsed;
        await rocheApi.storage.set("cat_feed", parsed);
        render();
        rocheApi.ui.toast("八卦打探完毕。");
        return;
      }
    } catch (e) {
      console.warn("AI 动态生成解析失败，降级本地数据源:", e);
    }
    
    const fallbackFeeds = [
      { sender: "奶橘阿强", text: "昨天找到大纸箱，里面还有羽毛垫子，躺上去极其舒爽，咪不打算出来了。" },
      { sender: "波斯丽丽", text: "为什么人类总是伸手想要抚摸咪的下巴，两脚兽真是奇怪的巨型物种。" },
      { sender: chars[0]?.handle || chars[0]?.name || "街区阿姨", text: `今天发现新买的外套竟然有几个抓痕，肯定是刚才那只${state.profile.color}猫咪搞的鬼。` },
      { sender: chars[1]?.handle || chars[1]?.name || "公寓前台", text: `谁的咸鱼又在晾衣架上不翼而飞了，地上只有几朵神秘的梅花印子。` }
    ];
    state.feed = fallbackFeeds;
    await rocheApi.storage.set("cat_feed", fallbackFeeds);
    render();
    rocheApi.ui.toast("打探完毕（本地预置数据）");
  }

  // --- 核心方法：AI 判定借宿请求 ---
  async function requestSleepAtCharHome(char) {
    rocheApi.ui.toast("正在朝 " + (char.handle || char.name) + " 发出撒娇信号...");
    
    let userPersonaName = "原宿主人类";
    try {
      const personas = await rocheApi.persona.getUserPersonas() || [];
      const matched = personas.find(p => p.id === state.activePersonaId);
      if (matched) {
        userPersonaName = matched.name || matched.handle || "原宿主人类";
      }
    } catch (e) {}

    const systemPrompt = `你现在正扮演宿主角色：${char.name}（人设：${char.persona || char.bio || ''}）。
【剧情核心设定】：
你熟识的朋友“${userPersonaName}”因为某些魔法或奇遇，【已经变成了一只猫咪】！
现在这只由“${userPersonaName}”变成的猫咪来到了你的家门口，正眼巴巴地蹲在门槛上冲着你喵呜叫借宿。它的猫形信息如下：
- 种族：${state.profile.breed}
- 花色：${state.profile.color}
- 特长：${state.profile.specialty}
- 魅力等级：${state.profile.charm}/100

你会允许这个变成了猫的“${userPersonaName}”今晚在你的沙发或阳台上借宿吗？
请完全融入你的人物性格进行决策，并严格以下列 JSON 格式回答。不要包含 Markdown 代码块标记，不要返回其他文字：
{
  "agreed": true, // 或者 false
  "reply": "你对变成了猫的 ${userPersonaName} 回应的一句话"
}`;

    try {
      const res = await rocheApi.ai.chat({
        messages: [{ role: 'user', content: systemPrompt }]
      });
      let cleanText = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsed = { agreed: true, reply: "喵呜，进来在毛毯上睡吧。" };
      try {
        parsed = JSON.parse(cleanText);
      } catch (e) {}
      
      const confirmResult = await rocheApi.ui.confirm({
        title: char.handle || char.name,
        message: `“${parsed.reply}”\n\n是否接受借宿决策？`
      });
      
      if (confirmResult) {
        if (parsed.agreed) {
          state.profile.energy = 100;
          state.profile.satiety = Math.max(0, state.profile.satiety - 5);
          rocheApi.ui.toast("借宿被批准。美美地睡了一觉，体力充满喵！");
        } else {
          state.profile.energy = Math.max(0, state.profile.energy - 3);
          rocheApi.ui.toast("被冷淡地赶走了，在寒风中消耗了些术体力。");
        }
        await saveProfile();
        render();
      }
    } catch (e) {
      console.error(e);
      rocheApi.ui.toast("无法与居民建立心理感应。");
    }
  }

  // --- 核心方法：多轮卡片式偶遇路人行为渲染 ---
  function renderEncounterModal() {
    let wrapper = containerEl.querySelector('#encounter-modal-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'encounter-modal-wrapper';
      containerEl.querySelector('.roche-plugin-iamacat').appendChild(wrapper);
    }
    
    if (!state.encounter) {
      wrapper.innerHTML = '';
      return;
    }
    
    wrapper.innerHTML = `
      <div class="modal-overlay">
        <div class="encounter-card">
          <div class="encounter-header">
            <span class="encounter-title-text">路人偶遇</span>
            <button class="icon-btn" id="close-encounter-btn" title="离开">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <!-- 显示路人场景和历史互动记录流 -->
          <div class="encounter-history-list" id="encounter-history-scroll">
            <div class="history-item scenario-start">路人：${state.encounter.scenario}</div>
            ${state.encounter.history.map(h => `
              <div class="history-item ${h.role === 'user' ? 'user-act' : 'npc-react'}">
                <span class="role-lbl">${h.role === 'user' ? '咪' : '路人'}：</span>
                <span class="text-val">${h.text}</span>
              </div>
            `).join('')}
          </div>
          
          ${state.encounter.loading ? `
            <div class="loading-placeholder">正在发生一些有趣的事情...</div>
          ` : `
            <form class="encounter-form" id="encounter-action-form">
              <div class="form-row">
                <input type="text" id="encounter-action-input" class="form-input" placeholder="写下猫咪要做的下一步捣蛋..." required autocomplete="off" />
              </div>
              <button type="submit" class="btn-primary" style="margin-top: 4px;">行动！</button>
            </form>
            <button class="btn-action" id="leave-encounter-btn" style="width: 100%;">悄然离开</button>
          `}
        </div>
      </div>
    `;
    
    // 自动滚动到底部以便看最新互动
    const histScroll = wrapper.querySelector('#encounter-history-scroll');
    if (histScroll) histScroll.scrollTop = histScroll.scrollHeight;

    // 绑定右上角与底部离开按钮
    wrapper.querySelector('#close-encounter-btn').onclick = () => {
      state.encounter = null;
      renderEncounterModal();
    };
    
    if (!state.encounter.loading) {
      wrapper.querySelector('#leave-encounter-btn').onclick = () => {
        state.encounter = null;
        renderEncounterModal();
        render();
      };

      const form = wrapper.querySelector('#encounter-action-form');
      form.onsubmit = async (e) => {
        e.preventDefault();
        const actionInput = wrapper.querySelector('#encounter-action-input');
        const actionText = actionInput.value.trim();
        if (!actionText) return;
        
        if (state.profile.energy < 0.5 || state.profile.satiety < 0.5) {
          rocheApi.ui.toast("精疲力竭了！请先吃点小鱼干或睡一觉。");
          return;
        }
        
        // 追加本轮行动记录
        state.encounter.history.push({ role: 'user', text: actionText });
        state.encounter.loading = true;
        renderEncounterModal();
        
        // 扣除资源并更新状态
        state.profile.energy = Math.max(0, state.profile.energy - 0.5);
        state.profile.satiety = Math.max(0, state.profile.satiety - 0.5);
        state.profile.mischief += 1;
        await saveProfile();
        
        // 编译偶遇上下文
        const historyContext = state.encounter.history.map(h => 
          `${h.role === 'user' ? '猫咪(我)行动' : '路人反应'}: ${h.text}`
        ).join('\n');

        const reactionPrompt = `你是一只猫。
当前场景是：[${state.encounter.scenario}]。
我们目前正在进行这一场景下连续的行为互动，以下是截至目前的历史互动经过：
${historyContext}

请生成这个人针对你最新的行动 [${actionText}] 产生的即时情绪反应与具体表现。
规则：
1. 他的态度可以偏友好（觉得治愈、轻轻抚摸），也可以偏困扰或防备（吓了一跳、抱怨并退后），但【绝对禁止出现任何对猫咪的暴力、伤害、踢踹或残虐残酷行为设定】。
2. 反应描述必须真实生动符合日常，字数严格限制在 50 字以内。
3. 千万不要带有任何 emoji 图标。
4. 请直接输出此人最新的反应言行，不要带有任何 Markdown 标记或多余前缀。`;
        
        try {
          const res = await rocheApi.ai.chat({
            messages: [{ role: 'user', content: reactionPrompt }]
          });
          state.encounter.loading = false;
          const reactionText = res.text || "路人叹了口气，避开了你。";
          state.encounter.history.push({ role: 'assistant', text: reactionText });
          renderEncounterModal();
        } catch (err) {
          state.encounter.loading = false;
          state.encounter.history.push({ role: 'assistant', text: "路人急匆匆地离开了。" });
          renderEncounterModal();
        }
      };
    }
  }

  // 触发偶遇 AI 场景
  async function triggerNPCOncounter() {
    rocheApi.ui.toast("正在小街上环顾四周...");
    
    state.encounter = {
      scenario: "一个行人急匆匆地走过街角。",
      history: [],
      loading: true
    };
    renderEncounterModal();
    
    const scenarioPrompt = `请生成一个极其简短的、富有画面感的高清日常生活细节。句式必须是“一个人正在干什么”的主动宾短句。
例如：‘一个保洁阿姨正在清扫路灯下落下的几片叶子。’ 或 ‘一个穿西装的男士正倚在墙角焦急地查看公文包。’。
注意：
1. 绝对不要包含任何 emoji 图标。
2. 字数控制在 25 字以内。
3. 请直接返回这句场景描述，不要带任何 Markdown 格式或多余解释。`;
    
    try {
      const res = await rocheApi.ai.chat({
        messages: [{ role: 'user', content: scenarioPrompt }]
      });
      state.encounter.scenario = res.text.trim();
      state.encounter.loading = false;
      renderEncounterModal();
    } catch (err) {
      state.encounter.scenario = "一个外卖骑手提着一份冒着热气的便当正向电梯跑去。";
      state.encounter.loading = false;
      renderEncounterModal();
    }
  }

  // --- 模块 4：“骚扰与对话” 核心子页面（面具随动、重置、双击编辑/重试） ---
  async function renderChatSubpage(bodyEl, headerBack, headerAction, isNpc, overrideHistory = null) {
    const personaId = state.activePersonaId || 'default_persona';
    const chatKey = isNpc ? null : `cat_chat_${personaId}_${state.currentChatChar.id}`;
    let chatHistory = [];
    
    // 如果没有传入覆盖的历史流，则异步从对应的面具缓存中读取
    if (overrideHistory) {
      chatHistory = overrideHistory;
    } else {
      try {
        chatHistory = await rocheApi.storage.get(chatKey) || [];
        if (chatHistory.length === 0) {
          chatHistory = [
            { role: 'assistant', text: `（你发现 ${state.currentChatChar.handle || state.currentChatChar.name} 独自坐着，发出了呼噜声引起它的注意）` }
          ];
          await rocheApi.storage.set(chatKey, chatHistory);
        }
      } catch (e) {
        console.error("加载骚扰记录失败", e);
      }
    }

    // 绑定右上角一键重置按钮 (NPC 临时会话不提供重置存档)
    if (!isNpc) {
      headerAction.innerHTML = `
        <button class="icon-btn" id="chat-reset-btn" title="重置对话">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      `;
      headerAction.querySelector('#chat-reset-btn').onclick = async () => {
        const confirmReset = await rocheApi.ui.confirm({
          title: "一键重置对话",
          message: "确认要清除当前面具下与此居民的所有骚扰对话记录吗？该操作无法恢复。"
        });
        if (confirmReset) {
          await rocheApi.storage.delete(chatKey);
          rocheApi.ui.toast("对话已重置。");
          state.currentChatChar = null;
          render();
        }
      };
    } else {
      headerAction.innerHTML = '';
    }

    bodyEl.innerHTML = `
      <div class="tab-content chat-subpage">
        <div class="chat-messages" id="chat-messages-container">
          ${chatHistory.map((msg, index) => `
            <div class="chat-bubble-row ${msg.role === 'user' ? 'me' : 'them'}">
              <div class="chat-bubble" data-index="${index}" title="双击消息可以编辑或从此重构">
                ${msg.text}
              </div>
            </div>
          `).join('')}
        </div>
        <form class="chat-input-bar" id="chat-message-form">
          <input type="text" id="chat-text-input" class="form-input" placeholder="输入叫声或肢体语言骚扰居民..." required autocomplete="off" />
          <button type="submit" class="btn-primary" style="width: auto; padding: 10px 18px;">发送</button>
        </form>
      </div>
    `;

    const container = bodyEl.querySelector('#chat-messages-container');
    if (container) container.scrollTop = container.scrollHeight;

    // 动态给聊天气泡绑定双击行为
    const bubbles = bodyEl.querySelectorAll('.chat-bubble');
    bubbles.forEach(bubble => {
      const index = parseInt(bubble.getAttribute('data-index'), 10);
      bubble.ondblclick = () => {
        showBubbleActionModal(index, chatHistory, chatKey, bodyEl, headerBack, headerAction, isNpc);
      };
    });

    const form = bodyEl.querySelector('#chat-message-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = bodyEl.querySelector('#chat-text-input');
      const text = input.value.trim();
      if (!text) return;

      if (state.profile.energy < 0.5 || state.profile.satiety < 0.5) {
        rocheApi.ui.toast("咪已经精疲力竭、饥肠辘辘了，快去探索页吃饱、睡觉恢复体力喵！");
        return;
      }

      chatHistory.push({ role: 'user', text });
      await rocheApi.storage.set(chatKey, chatHistory);

      state.profile.energy = Math.max(0, state.profile.energy - 0.5);
      state.profile.satiety = Math.max(0, state.profile.satiety - 0.5);
      state.profile.mischief += 1;
      await saveProfile();

      input.value = '';
      
      // 触发 AI 应答
      await triggerChatResponse(chatHistory, chatKey, bodyEl, headerBack, headerAction, isNpc);
    };
  }

  // --- 模块 5：双击处理浮层与核心重构引擎 ---
  function showBubbleActionModal(index, chatHistory, chatKey, bodyEl, headerBack, headerAction, isNpc) {
    const msg = chatHistory[index];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';
    
    overlay.innerHTML = `
      <div class="encounter-card" style="max-width: 280px; gap: 16px;">
        <div class="encounter-header">
          <span class="encounter-title-text">${msg.role === 'user' ? '猫咪的叫声/动作' : '对方的回应'}</span>
        </div>
        <div style="font-size: 11.5px; color: #5a6662; word-break: break-all; background: #f1f8f5; padding: 10px; border-radius: 6px; max-height: 80px; overflow-y: auto;">
          "${msg.text}"
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
          <button class="btn-primary" id="msg-edit-btn">修改此消息内容</button>
          <button class="btn-action" id="msg-rewind-btn" style="border-color: #e29295; color: #e29295;">从这里重回并重试</button>
          <button class="btn-action" id="msg-cancel-btn" style="border-color: #92a8a1; color: #92a8a1;">取消</button>
        </div>
      </div>
    `;
    
    bodyEl.appendChild(overlay);
    
    overlay.querySelector('#msg-cancel-btn').onclick = () => overlay.remove();
    
    // 修改消息分支
    overlay.querySelector('#msg-edit-btn').onclick = () => {
      overlay.remove();
      showMiniEditModal(index, msg.text, chatHistory, chatKey, bodyEl, headerBack, headerAction, isNpc);
    };
    
    // 从此重试分支 (撤回从当前直至最后的所有消息，并重新发起 LLM 对话)
    overlay.querySelector('#msg-rewind-btn').onclick = async () => {
      overlay.remove();
      
      let targetUserMsgIdx = -1;
      if (msg.role === 'user') {
        targetUserMsgIdx = index;
      } else {
        // 如果双击的是对方的回应，定位到我方上一句发送的信息
        for (let i = index - 1; i >= 0; i--) {
          if (chatHistory[i].role === 'user') {
            targetUserMsgIdx = i;
            break;
          }
        }
      }
      
      if (targetUserMsgIdx === -1) {
        rocheApi.ui.toast("没有找到更早的我方叫声以支持重新请求。");
        return;
      }

      // 截断该消息以后的所有历史信息 (实现撤回)
      const truncatedHistory = chatHistory.slice(0, targetUserMsgIdx + 1);
      await rocheApi.storage.set(chatKey, truncatedHistory);
      
      rocheApi.ui.toast("已成功撤回，正在重回对话...");
      
      // 重新开始请求 AI 响应
      await triggerChatResponse(truncatedHistory, chatKey, bodyEl, headerBack, headerAction, isNpc);
    };
  }

  // 极简内嵌输入框浮层
  function showMiniEditModal(index, text, chatHistory, chatKey, bodyEl, headerBack, headerAction, isNpc) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';
    
    overlay.innerHTML = `
      <div class="encounter-card" style="max-width: 280px;">
        <div class="encounter-header">
          <span class="encounter-title-text">修改信息</span>
        </div>
        <div class="form-row">
          <textarea id="edit-msg-textarea" class="form-input" style="height: 80px; resize: none; font-family: inherit;">${text}</textarea>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 8px; width: 100%;">
          <button class="btn-primary" id="edit-save-btn" style="flex: 1;">保存</button>
          <button class="btn-action" id="edit-cancel-btn" style="flex: 1; border-color: #92a8a1; color: #92a8a1;">取消</button>
        </div>
      </div>
    `;
    
    bodyEl.appendChild(overlay);
    
    overlay.querySelector('#edit-cancel-btn').onclick = () => overlay.remove();
    
    overlay.querySelector('#edit-save-btn').onclick = async () => {
      const newText = overlay.querySelector('#edit-msg-textarea').value.trim();
      if (!newText) {
        rocheApi.ui.toast("内容不能为空。");
        return;
      }
      
      chatHistory[index].text = newText;
      if (chatKey) {
        await rocheApi.storage.set(chatKey, chatHistory);
      }
      overlay.remove();
      rocheApi.ui.toast("修改成功。");
      renderChatSubpage(bodyEl, headerBack, headerAction, isNpc, chatHistory);
    };
  }

  // AI 响应逻辑
  async function triggerChatResponse(chatHistory, chatKey, bodyEl, headerBack, headerAction, isNpc) {
    // 渲染临时历史预览
    renderChatSubpage(bodyEl, headerBack, headerAction, isNpc, chatHistory);

    const headerTitle = containerEl.querySelector('#header-title-text');
    if (headerTitle) {
      headerTitle.innerText = "对方正在沉思...";
      headerTitle.classList.add('thinking-pulse');
    }

    try {
      let worldbookText = '';
      try {
        const entries = await rocheApi.worldbook.getEntries({ scope: 'global' });
        if (entries && entries.length > 0) {
          worldbookText = entries.map(e => `${e.keyword || e.key}: ${e.content || e.value}`).join('\n');
        }
      } catch (wbErr) {}

      let userPersonaName = "原宿主人类";
      try {
        const personas = await rocheApi.persona.getUserPersonas() || [];
        const matched = personas.find(p => p.id === state.activePersonaId);
        if (matched) {
          userPersonaName = matched.name || matched.handle || "原宿主人类";
        }
      } catch (e) {}

      const systemPrompt = `你现在扮演 Roche 居民：${state.currentChatChar.name}（性格设定：${state.currentChatChar.persona || state.currentChatChar.bio || ''}）。
【剧情核心设定】：
你平日里所熟识的朋友 “${userPersonaName}”，由于某种莫名而离奇的魔法或意外，【现在已经彻底变成了一只猫咪】！
现在这只由“${userPersonaName}”变成的猫咪正跑来你跟前捣蛋、狂叫和捣乱，它和你有着同一个人的灵魂。
你十分确信这就是它。所以，绝对不要把“${userPersonaName}”和这只猫咪分割开、当成两个独立的个体来互动！
你可能会感到既好气又好笑，有些无奈和惊奇，但必须根据这一“灵魂变猫”的反差关系做出反应。

这只猫形朋友的特征：
- 花色：${state.profile.color}
- 种族：${state.profile.breed}
- 猫咪特长：${state.profile.specialty}
- 魅力等级：${state.profile.charm}/100
- 淘气等级：${state.profile.mischief}

世界书环境设定背景：
${worldbookText}

请完全融入你的人物设定，面对【变成了猫咪的 ${userPersonaName}】此时跑来骚扰你的言行，做出符合你个性与两方关系的反应。
重要规则：
1. 你的回答必须非常简短、生活化，字数绝对控制在 80 字以内。
2. 绝对不准产生任何 emoji 图标，用纯文字和标点符号描述。`;

      const recentHistory = chatHistory.slice(-8);
      const chatPayload = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(m => ({
          role: m.role,
          content: m.text
        }))
      ];

      const messagesContainer = bodyEl.querySelector('#chat-messages-container');
      const typingBubble = document.createElement('div');
      typingBubble.className = 'chat-bubble-row them typing';
      typingBubble.innerHTML = `<div class="chat-bubble">正在回应喵...</div>`;
      messagesContainer.appendChild(typingBubble);
      typingBubble.scrollIntoView({ behavior: 'smooth' });

      const replyResult = await rocheApi.ai.chat({
        messages: chatPayload,
        temperature: 0.7
      });

      typingBubble.remove();

      const responseText = replyResult.text || '（只是静静地看着你，没有说话）';
      chatHistory.push({ role: 'assistant', text: responseText });

      if (chatKey) {
        await rocheApi.storage.set(chatKey, chatHistory);
      }
      
      // 触发界面完整重新载入
      render();
    } catch (aiErr) {
      console.error(aiErr);
      rocheApi.ui.toast("两脚兽似乎在发呆，暂时没有回应。");
      render();
    }
  }

  // --- 6. 注册插件到宿主环境 ---
  window.RochePlugin.register({
    id: "iamacat-plugin",
    name: "我是猫",
    version: "1.1.0",
    apps: [
      {
        id: "iamacat-home",
        name: "我是猫",
        icon: "extension",
        iconImage: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSIjZTI5Mjk1Ij48cGF0aCBkPSJNNTAsNDggQzM2LDQ4IDI4LDYyIDI4LDc2IEMyOCw5MCAzOCw5NCA1MCw5NEM2Miw5NCA3Miw5MCA3Miw3NkM3Miw2MiA2NCw0OCA1MCw0OCBaIi8+PGNpcmNsZSBjeD0iMjIiIGN5PSI0MyIgcj0iMTEiLz48Y2lyY2xlIGN4PSIzOCIgY3k9IjI0IiByPSIxMi41Ii8+PGNpcmNsZSBjeD0iNjIiIGN5PSIyNCIgcj0iMTIuNSIvPjxjaXJjbGUgY3g9Ijc4IiBjeT0iNDMiIHI9IjExIi8+PC9zdmc+",
        async mount(container, roche) {
          containerEl = container;
          rocheApi = roche;
          
          // 加载当前活动面具的状态存档
          await loadState();

          insertStyles();
          render();
        },
        async unmount(container, roche) {
          const styleEl = document.getElementById('roche-plugin-iamacat-styles');
          if (styleEl) styleEl.remove();
          
          if (container) {
            container.replaceChildren();
          }
          
          containerEl = null;
          rocheApi = null;
        }
      }
    ]
  });
})();