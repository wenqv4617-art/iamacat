window.RochePlugin.register({
  id: "iamacat-plugin",
  name: "我是猫",
  version: "1.0.0",
  apps: [
    {
      id: "iamacat-home",
      name: "我是猫",
      icon: "extension",
      async mount(container, roche) {
        // 1. 初始化宿主 API 和容器引用
        this.container = container;
        this.roche = roche;
        
        // 2. 状态机制
        this.state = {
          activeTab: 'explore', // 'explore' | 'harass' | 'profile'
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
          feed: []               // 探索信息流
        };

        // 3. 载入本地存储
        await this.loadState();
        
        // 4. 自动匹配当前人设
        try {
          const activeUser = await this.roche.persona.getActiveUserPersona();
          if (activeUser && !this.state.profile.activePersonaId) {
            this.state.profile.activePersonaId = activeUser.id;
          }
        } catch (e) {
          console.warn("读取默认人设失败:", e);
        }

        // 5. 插入作用域 CSS 样式
        this.insertStyles();

        // 6. 渲染 UI 并绑定事件
        this.render();
      },

      async unmount(container, roche) {
        // 清理样式
        const styleEl = document.getElementById('roche-plugin-iamacat-styles');
        if (styleEl) styleEl.remove();
        
        // 清理 DOM
        if (container) {
          container.replaceChildren();
        }
      },

      // --- 核心方法：状态管理与数据加载 ---
      async loadState() {
        try {
          const savedProfile = await this.roche.storage.get("cat_profile");
          if (savedProfile) {
            this.state.profile = { ...this.state.profile, ...savedProfile };
          }
          const savedFeed = await this.roche.storage.get("cat_feed");
          if (savedFeed) {
            this.state.feed = savedFeed;
          }
        } catch (e) {
          console.error("加载猫咪存档失败:", e);
        }
      },

      async saveProfile() {
        try {
          await this.roche.storage.set("cat_profile", this.state.profile);
        } catch (e) {
          console.error("保存猫咪存档失败:", e);
        }
      },

      // --- 核心方法：样式管理 ---
      insertStyles() {
        if (document.getElementById('roche-plugin-iamacat-styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'roche-plugin-iamacat-styles';
        styleEl.innerHTML = `
          .roche-plugin-iamacat {
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: #fafafa;
            color: #262626;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
            position: relative;
          }
          .roche-plugin-iamacat * {
            box-sizing: border-box;
          }
          .roche-plugin-iamacat .cat-header {
            height: 48px;
            border-bottom: 1px solid #efefef;
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
            color: #262626;
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
            border-top: 1px solid #efefef;
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
            color: #8e8e8e;
            font-size: 11px;
            gap: 3px;
            cursor: pointer;
            transition: color 0.15s ease;
            padding: 6px 0;
            flex: 1;
          }
          .roche-plugin-iamacat .nav-item.active {
            color: #262626;
          }
          .roche-plugin-iamacat .tab-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .roche-plugin-iamacat .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #262626;
            border-left: 2px solid #262626;
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
            border: 1px solid #efefef;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .roche-plugin-iamacat .stat-label {
            font-size: 11px;
            color: #8e8e8e;
          }
          .roche-plugin-iamacat .stat-value {
            font-size: 15px;
            font-weight: 600;
          }
          .roche-plugin-iamacat .stat-bar-bg {
            height: 4px;
            background-color: #f1f1f1;
            border-radius: 2px;
            overflow: hidden;
          }
          .roche-plugin-iamacat .stat-bar-fill {
            height: 100%;
            background-color: #262626;
            transition: width 0.3s ease;
          }
          .roche-plugin-iamacat .profile-form {
            background-color: #ffffff;
            border: 1px solid #efefef;
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .roche-plugin-iamacat .form-row {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .roche-plugin-iamacat .form-row label {
            font-size: 11px;
            font-weight: 500;
            color: #8e8e8e;
          }
          .roche-plugin-iamacat .form-input {
            border: 1px solid #dbdbdb;
            border-radius: 6px;
            padding: 8px 10px;
            font-size: 13px;
            outline: none;
            background-color: #fafafa;
            color: #262626;
            transition: border-color 0.2s;
          }
          .roche-plugin-iamacat .form-input:focus {
            border-color: #262626;
          }
          .roche-plugin-iamacat .btn-primary {
            background-color: #262626;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 10px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s;
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
            border: 1px solid #efefef;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .roche-plugin-iamacat .char-card:hover {
            background-color: #fcfcfc;
          }
          .roche-plugin-iamacat .char-avatar-container {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            border: 1px solid #efefef;
            background-color: #f1f1f1;
          }
          .roche-plugin-iamacat .char-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .roche-plugin-iamacat .char-avatar-placeholder {
            width: 100%;
            height: 100%;
            background-color: #e1e1e1;
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
            color: #8e8e8e;
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
            border: 1px solid #efefef;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .roche-plugin-iamacat .action-card-complex {
            background-color: #ffffff;
            border: 1px solid #efefef;
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
            color: #8e8e8e;
          }
          .roche-plugin-iamacat .btn-action {
            background-color: transparent;
            border: 1px solid #262626;
            color: #262626;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
            white-space: nowrap;
          }
          .roche-plugin-iamacat .btn-action:hover {
            background-color: #262626;
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
            border: 1px solid #efefef;
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
            color: #4a4a4a;
          }
          .roche-plugin-iamacat .loading-placeholder,
          .roche-plugin-iamacat .empty-placeholder {
            font-size: 11px;
            color: #8e8e8e;
            text-align: center;
            padding: 24px 12px;
          }
          .roche-plugin-iamacat .chat-subpage {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: calc(100vh - 160px);
          }
          .roche-plugin-iamacat .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 8px 4px;
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
          }
          .roche-plugin-iamacat .chat-bubble-row.me .chat-bubble {
            background-color: #262626;
            color: #ffffff;
            border-bottom-right-radius: 4px;
          }
          .roche-plugin-iamacat .chat-bubble-row.them .chat-bubble {
            background-color: #ffffff;
            color: #262626;
            border: 1px solid #efefef;
            border-bottom-left-radius: 4px;
          }
          .roche-plugin-iamacat .chat-bubble-row.typing .chat-bubble {
            color: #8e8e8e;
            font-style: italic;
          }
          .roche-plugin-iamacat .chat-input-bar {
            display: flex;
            gap: 8px;
            border-top: 1px solid #efefef;
            padding: 12px 0 0 0;
            flex-shrink: 0;
            background-color: #fafafa;
          }
          .roche-plugin-iamacat .chat-input-bar input {
            flex: 1;
          }
        `;
        document.head.appendChild(styleEl);
      },

      // --- 核心方法：页面主框架渲染 ---
      render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
          <div class="roche-plugin-iamacat">
            <header class="cat-header">
              <div class="header-left" id="header-back-btn"></div>
              <div class="header-title" id="header-title-text">我是猫</div>
              <div class="header-right" id="header-action-btn"></div>
            </header>
            <div class="cat-body" id="cat-body-content"></div>
            <nav class="cat-navbar">
              <button class="nav-item ${this.state.activeTab === 'explore' ? 'active' : ''}" id="nav-btn-explore">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                <span>探索</span>
              </button>
              <button class="nav-item ${this.state.activeTab === 'harass' ? 'active' : ''}" id="nav-btn-harass">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>骚扰</span>
              </button>
              <button class="nav-item ${this.state.activeTab === 'profile' ? 'active' : ''}" id="nav-btn-profile">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>我的</span>
              </button>
            </nav>
          </div>
        `;
        
        // 绑定底部导航切换事件
        this.container.querySelector('#nav-btn-explore').onclick = () => {
          this.state.activeTab = 'explore';
          this.state.currentChatChar = null;
          this.state.npcChat = null;
          this.render();
        };
        this.container.querySelector('#nav-btn-harass').onclick = () => {
          this.state.activeTab = 'harass';
          this.state.currentChatChar = null;
          this.state.npcChat = null;
          this.render();
        };
        this.container.querySelector('#nav-btn-profile').onclick = () => {
          this.state.activeTab = 'profile';
          this.state.currentChatChar = null;
          this.state.npcChat = null;
          this.render();
        };
        
        this.renderBody();
      },

      // --- 核心方法：子页面路由分发 ---
      async renderBody() {
        const bodyEl = this.container.querySelector('#cat-body-content');
        const headerTitle = this.container.querySelector('#header-title-text');
        const headerBack = this.container.querySelector('#header-back-btn');
        const headerAction = this.container.querySelector('#header-action-btn');
        
        headerBack.innerHTML = '';
        headerAction.innerHTML = '';
        
        if (this.state.activeTab === 'profile') {
          headerTitle.innerText = '猫咪资料';
          this.renderProfileTab(bodyEl);
        } else if (this.state.activeTab === 'harass') {
          if (this.state.currentChatChar) {
            headerTitle.innerText = `${this.state.currentChatChar.handle || this.state.currentChatChar.name}`;
            this.renderChatSubpage(bodyEl, headerBack, false);
          } else if (this.state.npcChat) {
            headerTitle.innerText = `${this.state.npcChat.npc.name}`;
            this.renderChatSubpage(bodyEl, headerBack, true);
          } else {
            headerTitle.innerText = '选择居民';
            this.renderHarassTab(bodyEl);
          }
        } else if (this.state.activeTab === 'explore') {
          headerTitle.innerText = '小街探索';
          this.renderExploreTab(bodyEl, headerAction);
        }
      },

      // --- 模块 1：“我的” 页面设计 ---
      async renderProfileTab(bodyEl) {
        let personas = [];
        try {
          personas = await this.roche.persona.getUserPersonas() || [];
        } catch (e) {
          console.warn("读取宿主人设失败:", e);
        }

        const optionsHtml = personas.map(p => 
          `<option value="${p.id}" ${this.state.profile.activePersonaId === p.id ? 'selected' : ''}>${p.name || p.handle || '未命名人设'}</option>`
        ).join('');
        
        bodyEl.innerHTML = `
          <div class="tab-content profile-tab">
            <div class="section-title">我的状态</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">体力</div>
                <div class="stat-value">${this.state.profile.energy.toFixed(1)}/100</div>
                <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${this.state.profile.energy}%"></div></div>
              </div>
              <div class="stat-card">
                <div class="stat-label">饱腹</div>
                <div class="stat-value">${this.state.profile.satiety.toFixed(1)}/100</div>
                <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${this.state.profile.satiety}%"></div></div>
              </div>
              <div class="stat-card">
                <div class="stat-label">魅力</div>
                <div class="stat-value">${this.state.profile.charm}/100</div>
                <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${this.state.profile.charm}%"></div></div>
              </div>
              <div class="stat-card">
                <div class="stat-label">淘气度</div>
                <div class="stat-value">${this.state.profile.mischief}</div>
                <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${Math.min(100, this.state.profile.mischief)}%"></div></div>
              </div>
            </div>
            
            <div class="section-title" style="margin-top: 12px;">猫咪设定</div>
            <form class="profile-form" id="cat-profile-form">
              <div class="form-row">
                <label>绑定宿主人设</label>
                <select id="profile-active-persona" class="form-input">
                  <option value="">请选择绑定人设</option>
                  ${optionsHtml}
                </select>
              </div>
              <div class="form-row">
                <label>花色</label>
                <input type="text" id="profile-color" class="form-input" value="${this.state.profile.color || ''}" placeholder="例如：奶牛猫">
              </div>
              <div class="form-row">
                <label>种族</label>
                <input type="text" id="profile-breed" class="form-input" value="${this.state.profile.breed || ''}" placeholder="例如：中华田园猫">
              </div>
              <div class="form-row">
                <label>特长</label>
                <input type="text" id="profile-specialty" class="form-input" value="${this.state.profile.specialty || ''}" placeholder="例如：特长捣蛋">
              </div>
              <div class="form-row">
                <label>魅力值 (0-100)</label>
                <input type="number" id="profile-charm" class="form-input" min="0" max="100" value="${this.state.profile.charm}">
              </div>
              <button type="submit" class="btn-primary" style="margin-top: 10px;">更新猫咪设定</button>
            </form>
          </div>
        `;
        
        // 保存逻辑
        bodyEl.querySelector('#cat-profile-form').onsubmit = (e) => {
          e.preventDefault();
          const color = bodyEl.querySelector('#profile-color').value.trim();
          const breed = bodyEl.querySelector('#profile-breed').value.trim();
          const specialty = bodyEl.querySelector('#profile-specialty').value.trim();
          const charm = parseInt(bodyEl.querySelector('#profile-charm').value, 10) || 0;
          const personaId = bodyEl.querySelector('#profile-active-persona').value;
          
          this.state.profile.color = color || "神秘花色";
          this.state.profile.breed = breed || "猫咪族";
          this.state.profile.specialty = specialty || "擅长睡觉";
          this.state.profile.charm = Math.max(0, Math.min(100, charm));
          this.state.profile.activePersonaId = personaId;
          
          this.saveProfile();
          this.roche.ui.toast("猫咪设定修改成功喵。");
          this.render();
        };
      },

      // --- 模块 2：“骚扰” 页面设计 ---
      async renderHarassTab(bodyEl) {
        bodyEl.innerHTML = `
          <div class="tab-content harass-tab">
            <div class="section-title">街区居民</div>
            <div class="char-list" id="harass-char-list">
              <div class="loading-placeholder">正在感应附近的居民...</div>
            </div>
          </div>
        `;
        
        try {
          const chars = await this.roche.character.list() || [];
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
              this.state.currentChatChar = char;
              this.render();
            };
            
            listEl.appendChild(charCard);
            this.fetchLastMsg(char);
          }
        } catch (e) {
          console.error(e);
          bodyEl.querySelector('#harass-char-list').innerHTML = `<div class="empty-placeholder">感应居民失败，请重试。</div>`;
        }
      },

      // 异步加载上一条聊天记录的前 15 字
      async fetchLastMsg(char) {
        try {
          const msgs = await this.roche.memory.getShortTerm({ conversationId: char.conversationId, limit: 1 });
          const placeholder = document.getElementById(`last-msg-${char.id}`);
          if (placeholder) {
            if (msgs && msgs.length > 0) {
              const text = msgs[0].text || '';
              placeholder.innerText = text.length > 15 ? text.slice(0, 15) + '...' : text;
            } else {
              placeholder.innerText = '还没对它进行过骚扰。';
            }
          }
        } catch (e) {
          const placeholder = document.getElementById(`last-msg-${char.id}`);
          if (placeholder) placeholder.innerText = '嗅探记录失败';
        }
      },

      // --- 模块 3：“探索” 页面设计 ---
      async renderExploreTab(bodyEl, headerAction) {
        // 右上角打探按钮
        headerAction.innerHTML = `
          <button class="icon-btn" id="explore-refresh-btn" title="打探猫咪圈">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
        `;
        headerAction.querySelector('#explore-refresh-btn').onclick = () => {
          this.refreshFeed();
        };
        
        let chars = [];
        try {
          chars = await this.roche.character.list() || [];
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
              
              <!-- 偶遇 -->
              <div class="action-card">
                <div class="action-meta">
                  <span class="action-name">偶遇幸运路人</span>
                  <span class="action-desc">在街角寻找随机生成人类开启骚扰</span>
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
        
        // 控制睡觉二级菜单
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
        
        // 绑定动作按钮
        bodyEl.querySelector('#action-eat-btn').onclick = () => {
          this.state.profile.satiety = Math.min(100, this.state.profile.satiety + 30);
          this.saveProfile();
          this.roche.ui.toast("小鱼干真美味，饱腹感提升了。");
          this.render();
        };
        
        bodyEl.querySelector('#action-sleep-btn').onclick = async () => {
          const loc = locSelect.value;
          if (loc === 'park') {
            this.state.profile.energy = Math.min(100, this.state.profile.energy + 10);
            this.saveProfile();
            this.roche.ui.toast("在公园长椅上打个盹，恢复了些体力。");
            this.render();
          } else if (loc === 'street') {
            this.state.profile.energy = Math.min(100, this.state.profile.energy + 15);
            this.saveProfile();
            this.roche.ui.toast("暖呼呼的马路水泥地实在太舒服了，体力恢复。");
            this.render();
          } else if (loc === 'char-home') {
            const targetCharId = charSelect.value;
            const targetChar = chars.find(c => c.id === targetCharId);
            if (targetChar) {
              await this.requestSleepAtCharHome(targetChar);
            }
          }
        };
        
        bodyEl.querySelector('#action-npc-btn').onclick = () => {
          this.triggerNPCOncounter();
        };
        
        this.renderFeedList(bodyEl.querySelector('#explore-feed-list'));
      },

      renderFeedList(feedListEl) {
        if (!feedListEl) return;
        if (!this.state.feed || this.state.feed.length === 0) {
          feedListEl.innerHTML = `<div class="empty-placeholder">周围平静极了，点击右上角打探猫群最新的动作动态。</div>`;
          return;
        }
        
        feedListEl.innerHTML = '';
        this.state.feed.forEach(item => {
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
      },

      // --- 核心方法：AI 生成猫咪社交信息流 ---
      async refreshFeed() {
        this.roche.ui.toast("正在向附近的流浪猫打探风声...");
        let chars = [];
        try {
          chars = await this.roche.character.list() || [];
        } catch (e) {}
        
        const charNames = chars.map(c => c.handle || c.name).slice(0, 5).join("、");
        const systemPrompt = `你是一个猫咪社区日常状态生成器。我们需要为“猫咪社交群”生成 4 条无 Emoji 的极简文字动态。
周围已知的人类居民有：${charNames || "神秘两脚兽"}。
玩家猫咪的详情：
- 花色：${this.state.profile.color}
- 种族：${this.state.profile.breed}
- 特长：${this.state.profile.specialty}

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
          const res = await this.roche.ai.chat({
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.8
          });
          let cleanText = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanText);
          if (Array.isArray(parsed)) {
            this.state.feed = parsed;
            await this.roche.storage.set("cat_feed", parsed);
            this.render();
            this.roche.ui.toast("八卦打探完毕。");
            return;
          }
        } catch (e) {
          console.warn("AI 动态生成解析失败，降级本地数据源:", e);
        }
        
        // 兜底本地数据（防止无网络或 API 限制）
        const fallbackFeeds = [
          { sender: "奶橘阿强", text: "昨天找到大纸箱，里面还有羽毛垫子，躺上去极其舒爽，咪不打算出来了。" },
          { sender: "波斯丽丽", text: "为什么人类总是伸手想要抚摸咪的下巴，两脚兽真是奇怪的巨型物种。" },
          { sender: chars[0]?.handle || chars[0]?.name || "街区阿姨", text: `今天发现新买的外套竟然有几个抓痕，肯定是刚才那只${this.state.profile.color}猫咪搞的鬼。` },
          { sender: chars[1]?.handle || chars[1]?.name || "公寓前台", text: `谁的咸鱼又在晾衣架上不翼而飞了，地上只有几朵神秘的梅花印子。` }
        ];
        this.state.feed = fallbackFeeds;
        await this.roche.storage.set("cat_feed", fallbackFeeds);
        this.render();
        this.roche.ui.toast("打探完毕（本地预置数据）");
      },

      // --- 核心方法：AI 判定借宿请求 ---
      async requestSleepAtCharHome(char) {
        this.roche.ui.toast("正在朝 " + (char.handle || char.name) + " 发出撒娇信号...");
        const systemPrompt = `你现在正扮演宿主角色：${char.name}（人设：${char.persona || char.bio || ''}）。
现在有一只猫咪正在向你借宿。它的信息如下：
- 种族：${this.state.profile.breed}
- 花色：${this.state.profile.color}
- 特长：${this.state.profile.specialty}
- 魅力等级：${this.state.profile.charm}/100

猫咪正眼巴巴地蹲在门槛上冲着你喵呜叫。你会允许这只小家伙今晚在你的沙发或阳台上借宿吗？
请完全融入你的人物性格进行决策，并严格以下列 JSON 格式回答。不要包含 Markdown 代码块标记，不要返回其他文字：
{
  "agreed": true, // 或者 false
  "reply": "你对猫咪做出的回应一句话"
}`;

        try {
          const res = await this.roche.ai.chat({
            messages: [{ role: 'user', content: systemPrompt }]
          });
          let cleanText = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
          let parsed = { agreed: true, reply: "喵呜，进来在毛毯上睡吧。" };
          try {
            parsed = JSON.parse(cleanText);
          } catch (e) {}
          
          const confirmResult = await this.roche.ui.confirm({
            title: char.handle || char.name,
            message: `“${parsed.reply}”\n\n是否接受借宿决策？`
          });
          
          if (confirmResult) {
            if (parsed.agreed) {
              this.state.profile.energy = 100;
              this.state.profile.satiety = Math.max(0, this.state.profile.satiety - 5);
              this.roche.ui.toast("借宿被批准。美美地睡了一觉，体力充满喵！");
            } else {
              this.state.profile.energy = Math.max(0, this.state.profile.energy - 3);
              this.roche.ui.toast("被冷淡地赶走了，在寒风中消耗了些许体力。");
            }
            this.saveProfile();
            this.render();
          }
        } catch (e) {
          console.error(e);
          this.roche.ui.toast("无法与居民建立心理感应。");
        }
      },

      // --- 核心方法：随机路人 NPC 生成 ---
      async triggerNPCOncounter() {
        this.roche.ui.toast("正在大街上搜索路人...");
        const prompt = `请生成一个街头的简短人类路人身份设定，用于和一只调皮的猫咪开启临时聊天。
请严格返回如下 JSON 结构，不要含有 Markdown 代码标记：
{
  "name": "路人身份名 (例如：行色匆匆的上班族)",
  "bio": "性格及心理状态 (例如：正因为赶地铁而焦虑不安)"
}`;
        try {
          const res = await this.roche.ai.chat({
            messages: [{ role: 'user', content: prompt }]
          });
          let cleanText = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
          let npc = { name: "忙碌的外卖员", bio: "正在焦急核对订单地址" };
          try {
            npc = JSON.parse(cleanText);
          } catch (err) {}
          
          this.state.npcChat = {
            npc: npc,
            messages: [
              { role: 'assistant', text: `（在街角偶遇了：${npc.name}。当前状态：${npc.bio}。你可以对它喵呜叫唤或恶作剧。）` }
            ]
          };
          this.render();
        } catch (e) {
          this.roche.ui.toast("现在街上静悄悄的，没有过路人。");
        }
      },

      // --- 模块 4：“骚扰与对话” 子页面（多轮对话） ---
      async renderChatSubpage(bodyEl, headerBack, isNpc) {
        headerBack.innerHTML = `
          <button class="icon-btn" id="chat-back-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        `;
        headerBack.querySelector('#chat-back-btn').onclick = () => {
          if (isNpc) {
            this.state.npcChat = null;
          } else {
            this.state.currentChatChar = null;
          }
          this.render();
        };

        const chatKey = isNpc ? null : `cat_chat_${this.state.currentChatChar.id}`;
        let chatHistory = [];
        
        if (isNpc) {
          chatHistory = this.state.npcChat.messages;
        } else {
          try {
            chatHistory = await this.roche.storage.get(chatKey) || [];
            if (chatHistory.length === 0) {
              chatHistory = [
                { role: 'assistant', text: `（你发现 ${this.state.currentChatChar.handle || this.state.currentChatChar.name} 独自坐着，发出了呼噜声引起它的注意）` }
              ];
              await this.roche.storage.set(chatKey, chatHistory);
            }
          } catch (e) {
            console.error("加载骚扰记录失败", e);
          }
        }

        bodyEl.innerHTML = `
          <div class="tab-content chat-subpage">
            <div class="chat-messages" id="chat-messages-container">
              ${chatHistory.map(msg => `
                <div class="chat-bubble-row ${msg.role === 'user' ? 'me' : 'them'}">
                  <div class="chat-bubble">
                    ${msg.text}
                  </div>
                </div>
              `).join('')}
            </div>
            <form class="chat-input-bar" id="chat-message-form">
              <input type="text" id="chat-text-input" class="form-input" placeholder="输入叫声或肢体语言骚扰居民..." required autocomplete="off" />
              <button type="submit" class="btn-primary">发送</button>
            </form>
          </div>
        `;

        // 滚动至最新消息
        const container = bodyEl.querySelector('#chat-messages-container');
        if (container) container.scrollTop = container.scrollHeight;

        // 消息发送处理
        const form = bodyEl.querySelector('#chat-message-form');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const input = bodyEl.querySelector('#chat-text-input');
          const text = input.value.trim();
          if (!text) return;

          // 资源硬性限制
          if (this.state.profile.energy < 0.5 || this.state.profile.satiety < 0.5) {
            this.roche.ui.toast("咪已经精疲力竭、饥肠辘辘了，快去探索页吃饱、睡觉恢复体力喵！");
            return;
          }

          // 追加用户消息
          chatHistory.push({ role: 'user', text });
          if (isNpc) {
            this.state.npcChat.messages = chatHistory;
          } else {
            await this.roche.storage.set(chatKey, chatHistory);
          }

          // 改变状态（每次骚扰消耗 0.5 体力和饱腹，增加 1 淘气度）
          this.state.profile.energy = Math.max(0, this.state.profile.energy - 0.5);
          this.state.profile.satiety = Math.max(0, this.state.profile.satiety - 0.5);
          this.state.profile.mischief += 1;
          this.saveProfile();

          // 快速重绘输入状态，保持顺畅
          input.value = '';
          this.renderChatSubpage(bodyEl, headerBack, isNpc);

          // 触发 AI 应答
          try {
            let systemPrompt = '';
            if (isNpc) {
              systemPrompt = `你现在是路人：${this.state.npcChat.npc.name}（设定特征：${this.state.npcChat.npc.bio}）。
现在，有一只猫咪正在街上骚扰你。猫咪信息：
- 花色：${this.state.profile.color}
- 种族：${this.state.profile.breed}
- 特长：${this.state.profile.specialty}
- 魅力度：${this.state.profile.charm}/100
- 淘气值：${this.state.profile.mischief}

请以此路人的口吻做出合理的、富有生活气的反馈，保持极简对话。
重要规则：绝对不可以带有任何 emoji 图标，字数严格限制在 50 字以内。`;
            } else {
              // 注入全局世界书（如有）
              let worldbookText = '';
              try {
                const entries = await this.roche.worldbook.getEntries({ scope: 'global' });
                if (entries && entries.length > 0) {
                  worldbookText = entries.map(e => `${e.keyword || e.key}: ${e.content || e.value}`).join('\n');
                }
              } catch (wbErr) {}

              systemPrompt = `你现在扮演 Roche 居民：${this.state.currentChatChar.name}（性格设定：${this.state.currentChatChar.persona || this.state.currentChatChar.bio || ''}）。
现在有一只猫咪正在‘骚扰’你。猫咪详情：
- 花色：${this.state.profile.color}
- 种族：${this.state.profile.breed}
- 特长：${this.state.profile.specialty}
- 魅力：${this.state.profile.charm}/100
- 淘气值：${this.state.profile.mischief}

世界书环境设定背景：
${worldbookText}

请完全符合你的性格特征。在被这只猫咪黏人、抓裤腿或讨要零食的叫声骚扰时，你该做出何种自然的互动反应。
重要规则：
1. 你的回答必须非常生活化，简短，字数严格控制在 80 字以内。
2. 千万不可产生任何 emoji 图标，用纯文字和标点符号描述。`;
            }

            // 获取最新 8 轮上下文限制 tokens
            const recentHistory = chatHistory.slice(-8);
            const chatPayload = [
              { role: 'system', content: systemPrompt },
              ...recentHistory.map(m => ({
                role: m.role,
                content: m.text
              }))
            ];

            // 渲染“响应中”动画
            const typingBubble = document.createElement('div');
            typingBubble.className = 'chat-bubble-row them typing';
            typingBubble.innerHTML = `<div class="chat-bubble">正在回应喵...</div>`;
            bodyEl.querySelector('#chat-messages-container').appendChild(typingBubble);
            typingBubble.scrollIntoView({ behavior: 'smooth' });

            const replyResult = await this.roche.ai.chat({
              messages: chatPayload,
              temperature: 0.7
            });

            typingBubble.remove();

            const responseText = replyResult.text || '（只是静静地看着你，没有说话）';
            chatHistory.push({ role: 'assistant', text: responseText });

            if (isNpc) {
              this.state.npcChat.messages = chatHistory;
            } else {
              await this.roche.storage.set(chatKey, chatHistory);
            }

            this.renderChatSubpage(bodyEl, headerBack, isNpc);
          } catch (aiErr) {
            console.error(aiErr);
            this.roche.ui.toast("两脚兽似乎在发呆，暂时没有回应。");
          }
        };
      }
    }
  ]
});