// ==========================================================================
// КОСМИЧЕСКАЯ СТАНЦИЯ - Основной скрипт
// Версия: 3.0
// Оптимизировано для производительности
// ==========================================================================

'use strict';

// Конфигурация
const CONFIG = {
    APP_NAME: 'Космическая Станция',
    VERSION: '3.0.0',
    API_BASE_URL: 'https://api.spaceweb.example.com',
    WS_URL: 'wss://ws.spaceweb.example.com',
    LOCAL_STORAGE_KEY: 'spaceStation_v3',
    MAX_MESSAGES: 1000,
    MAX_FRIENDS: 500,
    NOTIFICATION_TIMEOUT: 5000,
    SOUND_ENABLED: true,
    DEBUG: false
};

// Основной класс приложения
class SpaceStationApp {
    constructor() {
        this.currentUser = null;
        this.users = new Map();
        this.messages = [];
        this.friends = new Map();
        this.onlineUsers = new Set();
        this.achievements = new Map();
        this.games = new Map();
        this.theme = 'default';
        this.notificationQueue = [];
        this.isSocketConnected = false;
        this.isLoading = false;
        this.lastActivity = Date.now();
        
        // Canvas для звёзд
        this.starCanvas = null;
        this.starCtx = null;
        this.stars = [];
        
        // Аудио
        this.audioContext = null;
        this.sounds = new Map();
        
        this.init();
    }

    // Инициализация приложения
    async init() {
        try {
            this.showLoading(true);
            this.log('Инициализация приложения...');
            
            // Инициализация canvas
            this.initStarCanvas();
            
            // Загрузка данных
            await this.loadData();
            
            // Настройка событий
            this.setupEventListeners();
            
            // Проверка авторизации
            this.checkAuth();
            
            // Инициализация звуков
            this.initSounds();
            
            // Запуск фоновых процессов
            this.startBackgroundTasks();
            
            this.log('Приложение инициализировано');
            
            // Показ заставки
            await this.showLoadingScreen();
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showNotification('Ошибка инициализации системы', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Инициализация canvas для звёзд
    initStarCanvas() {
        this.starCanvas = document.getElementById('starCanvas');
        if (!this.starCanvas) return;
        
        this.starCtx = this.starCanvas.getContext('2d');
        
        // Установка размеров canvas
        const resizeCanvas = () => {
            this.starCanvas.width = window.innerWidth;
            this.starCanvas.height = window.innerHeight;
            this.createStars();
        };
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        
        // Запуск анимации
        this.animateStars();
    }

    // Создание звёзд
    createStars() {
        this.stars = [];
        const starCount = Math.min(300, Math.floor((window.innerWidth * window.innerHeight) / 4000));
        
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.starCanvas.width,
                y: Math.random() * this.starCanvas.height,
                size: Math.random() * 3 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                brightness: Math.random() * 0.5 + 0.5,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                pulseDirection: 1
            });
        }
    }

    // Анимация звёзд
    animateStars() {
        if (!this.starCtx) return;
        
        // Очистка canvas с эффектом затухания
        this.starCtx.fillStyle = 'rgba(10, 10, 42, 0.1)';
        this.starCtx.fillRect(0, 0, this.starCanvas.width, this.starCanvas.height);
        
        // Отрисовка звёзд
        this.stars.forEach(star => {
            // Обновление пульсации
            star.brightness += star.pulseSpeed * star.pulseDirection;
            if (star.brightness > 1 || star.brightness < 0.3) {
                star.pulseDirection *= -1;
            }
            
            // Обновление позиции
            star.y += star.speed;
            if (star.y > this.starCanvas.height) {
                star.y = 0;
                star.x = Math.random() * this.starCanvas.width;
            }
            
            // Отрисовка звезды
            const gradient = this.starCtx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 2
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.brightness})`);
            gradient.addColorStop(0.5, `rgba(200, 220, 255, ${star.brightness * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.starCtx.beginPath();
            this.starCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.starCtx.fillStyle = gradient;
            this.starCtx.fill();
            
            // Эффект свечения для больших звёзд
            if (star.size > 1.5) {
                this.starCtx.beginPath();
                this.starCtx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                this.starCtx.fillStyle = `rgba(100, 150, 255, ${star.brightness * 0.1})`;
                this.starCtx.fill();
            }
        });
        
        requestAnimationFrame(() => this.animateStars());
    }

    // Показать/скрыть загрузку
    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (!loadingEl) return;
        
        if (show) {
            loadingEl.style.display = 'flex';
            this.isLoading = true;
            
            // Анимация прогресса
            let progress = 0;
            const progressBar = document.getElementById('progressBar');
            const interval = setInterval(() => {
                progress += Math.random() * 10;
                if (progress > 100) progress = 100;
                if (progressBar) progressBar.style.width = `${progress}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 100);
        } else {
            loadingEl.style.opacity = '0';
            setTimeout(() => {
                loadingEl.style.display = 'none';
                loadingEl.style.opacity = '1';
                this.isLoading = false;
            }, 500);
        }
    }

    // Показать экран загрузки
    async showLoadingScreen() {
        return new Promise(resolve => {
            setTimeout(() => {
                this.showNotification('Добро пожаловать на Космическую Станцию!', 'success');
                this.playSound('notification');
                resolve();
            }, 1500);
        });
    }

    // Загрузка данных
    async loadData() {
        try {
            // Загрузка из localStorage
            const data = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                
                // Восстановление пользователей
                if (parsed.users) {
                    parsed.users.forEach(user => {
                        this.users.set(user.username, user);
                    });
                }
                
                // Восстановление сообщений
                if (parsed.messages) {
                    this.messages = parsed.messages.slice(-CONFIG.MAX_MESSAGES);
                }
                
                // Восстановление друзей
                if (parsed.friends) {
                    parsed.friends.forEach(friend => {
                        this.friends.set(friend.id, friend);
                    });
                }
                
                // Восстановление темы
                if (parsed.settings?.theme) {
                    this.theme = parsed.settings.theme;
                    this.applyTheme(this.theme);
                }
                
                this.log('Данные загружены из localStorage');
            }
            
            // Если данных нет, создаём демо-данные
            if (this.users.size === 0) {
                await this.createDemoData();
            }
            
            // Загрузка достижений
            await this.loadAchievements();
            
            // Загрузка игр
            await this.loadGames();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            await this.createDemoData();
        }
    }

    // Создание демо-данных
    async createDemoData() {
        this.log('Создание демо-данных...');
        
        const demoUsers = [
            {
                id: '1',
                username: 'Космонавт',
                email: 'cosmonaut@space.com',
                avatar: '👨‍🚀',
                bio: 'Исследую просторы Вселенной. Люблю звёзды, туманности и чёрные дыры.',
                level: 42,
                experience: 12500,
                friends: ['2', '3'],
                achievements: ['first_message', 'friend_maker', 'explorer', 'chat_master'],
                registeredAt: new Date('2023-01-15').toISOString(),
                lastSeen: new Date().toISOString(),
                status: 'online',
                theme: 'default'
            },
            {
                id: '2',
                username: 'Галактика',
                email: 'galaxy@space.com',
                avatar: '🌌',
                bio: 'Люблю космические туманности и рождение новых звёзд.',
                level: 28,
                experience: 8500,
                friends: ['1'],
                achievements: ['first_message', 'gamer'],
                registeredAt: new Date('2023-03-20').toISOString(),
                lastSeen: new Date(Date.now() - 3600000).toISOString(),
                status: 'away',
                theme: 'purple'
            },
            {
                id: '3',
                username: 'Звездочёт',
                email: 'stargazer@space.com',
                avatar: '⭐',
                bio: 'Наблюдаю за звёздами каждую ночь. Люблю делиться открытиями.',
                level: 35,
                experience: 10200,
                friends: ['1'],
                achievements: ['first_message'],
                registeredAt: new Date('2023-02-10').toISOString(),
                lastSeen: new Date(Date.now() - 7200000).toISOString(),
                status: 'offline',
                theme: 'green'
            }
        ];
        
        demoUsers.forEach(user => {
            this.users.set(user.username, user);
        });
        
        // Демо-сообщения
        this.messages = [
            {
                id: '1',
                userId: 'system',
                username: 'Система',
                avatar: '🚀',
                text: 'Добро пожаловать в космический чат! Здесь вы можете общаться с другими исследователями Вселенной.',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                type: 'system'
            },
            {
                id: '2',
                userId: '1',
                username: 'Космонавт',
                avatar: '👨‍🚀',
                text: 'Привет всем! Сегодня наблюдал за туманностью Ориона. Невероятное зрелище!',
                timestamp: new Date(Date.now() - 43200000).toISOString(),
                type: 'user'
            },
            {
                id: '3',
                userId: '2',
                username: 'Галактика',
                avatar: '🌌',
                text: 'Привет! Я только что прочитала о новых экзопланетах. На одной из них может быть жизнь!',
                timestamp: new Date(Date.now() - 21600000).toISOString(),
                type: 'user'
            }
        ];
        
        // Сохранение данных
        await this.saveData();
        
        this.log('Демо-данные созданы');
    }

    // Сохранение данных
    async saveData() {
        try {
            const data = {
                users: Array.from(this.users.values()),
                messages: this.messages,
                friends: Array.from(this.friends.values()),
                settings: {
                    theme: this.theme,
                    soundEnabled: CONFIG.SOUND_ENABLED,
                    lastSaved: new Date().toISOString()
                }
            };
            
            localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(data));
            this.log('Данные сохранены');
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
        }
    }

    // Загрузка достижений
    async loadAchievements() {
        const achievementsData = [
            {
                id: 'first_message',
                name: 'Первый контакт',
                description: 'Отправить первое сообщение в чат',
                icon: '💬',
                points: 10,
                unlocked: false
            },
            {
                id: 'friend_maker',
                name: 'Космический дипломат',
                description: 'Добавить первого друга',
                icon: '🤝',
                points: 20,
                unlocked: false
            },
            {
                id: 'chat_master',
                name: 'Мастер общения',
                description: 'Отправить 100 сообщений',
                icon: '🗣️',
                points: 50,
                unlocked: false
            },
            {
                id: 'explorer',
                name: 'Исследователь',
                description: 'Посетить все разделы станции',
                icon: '🔭',
                points: 30,
                unlocked: false
            },
            {
                id: 'gamer',
                name: 'Космический геймер',
                description: 'Сыграть во все игры',
                icon: '🎮',
                points: 40,
                unlocked: false
            },
            {
                id: 'social',
                name: 'Социальная бабочка',
                description: 'Иметь 10 друзей',
                icon: '🦋',
                points: 60,
                unlocked: false
            }
        ];
        
        achievementsData.forEach(achievement => {
            this.achievements.set(achievement.id, achievement);
        });
        
        this.log('Достижения загружены');
    }

    // Загрузка игр
    async loadGames() {
        const gamesData = [
            {
                id: 'asteroids',
                name: 'Астероидный дождь',
                description: 'Уклоняйтесь от астероидов и сбивайте их лазером!',
                icon: 'fas fa-meteor',
                highScore: 0,
                players: 125,
                rating: 4.5
            },
            {
                id: 'quiz',
                name: 'Космическая викторина',
                description: 'Проверьте свои знания о космосе!',
                icon: 'fas fa-question-circle',
                highScore: 0,
                players: 89,
                rating: 5.0
            },
            {
                id: 'race',
                name: 'Космическая гонка',
                description: 'Соревнуйтесь с другими игроками в космических гонках!',
                icon: 'fas fa-rocket',
                highScore: 0,
                players: 203,
                rating: 4.0
            }
        ];
        
        gamesData.forEach(game => {
            this.games.set(game.id, game);
        });
        
        this.log('Игры загружены');
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                
                if (page === 'logout') {
                    this.logout();
                    return;
                }
                
                this.switchPage(page);
            });
        });

        // Боковое меню
        document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // Вкладки друзей
        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchFriendsTab(tab);
            });
        });

        // Вкладки профиля
        document.querySelectorAll('.profile-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchProfileTab(tabId);
            });
        });

        // Мобильное меню
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.toggle('active');
            });
        }

        // Авторизация
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        // Переключение между формами авторизации
        document.getElementById('showRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('registerModal');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('authModal');
        });

        // Чат
        const sendMessageBtn = document.getElementById('sendMessage');
        const chatInput = document.getElementById('chatInput');
        
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Счётчик символов
            chatInput.addEventListener('input', () => {
                const charCount = document.getElementById('charCount');
                if (charCount) {
                    charCount.textContent = `${chatInput.value.length}/500`;
                }
            });
        }

        // Профиль
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.showProfileEditor();
        });

        document.getElementById('saveProfile')?.addEventListener('click', () => {
            this.saveProfile();
        });

        // Поиск друзей
        const friendSearch = document.getElementById('friendSearch');
        if (friendSearch) {
            friendSearch.addEventListener('input', (e) => {
                this.searchFriends(e.target.value);
            });
        }

        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Клик вне модального окна
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Редактирование профиля
        document.querySelectorAll('.editor-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.switchEditorSection(section);
            });
        });

        // Выбор аватара
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                const avatar = option.dataset.avatar;
                this.selectAvatar(avatar);
            });
        });

        // Выбор темы
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.selectTheme(theme);
            });
        });

        // Звук
        document.getElementById('toggleSound')?.addEventListener('click', () => {
            this.toggleSound();
        });

        // Очистка чата
        document.getElementById('clearChat')?.addEventListener('click', () => {
            this.clearChat();
        });

        // Добавление друга
        document.getElementById('addFriendBtn')?.addEventListener('click', () => {
            this.showAddFriendModal();
        });

        // Обновление онлайн пользователей
        document.getElementById('refreshOnline')?.addEventListener('click', () => {
            this.updateOnlineUsers();
        });

        // Обработка неактивности
        document.addEventListener('mousemove', () => {
            this.lastActivity = Date.now();
        });

        document.addEventListener('keypress', () => {
            this.lastActivity = Date.now();
        });

        // Сохранение при закрытии
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });

        this.log('Обработчики событий настроены');
    }

    // Проверка авторизации
    checkAuth() {
        const session = localStorage.getItem(`${CONFIG.LOCAL_STORAGE_KEY}_session`);
        
        if (session) {
            try {
                this.currentUser = JSON.parse(session);
                this.updateUIForUser();
                this.hideModal('authModal');
                this.showNotification(`С возвращением, ${this.currentUser.username}!`, 'success');
                this.playSound('notification');
            } catch (error) {
                console.error('Ошибка восстановления сессии:', error);
                localStorage.removeItem(`${CONFIG.LOCAL_STORAGE_KEY}_session`);
                this.showModal('authModal');
            }
        } else {
            this.showModal('authModal');
        }
    }

    // Вход
    async login() {
        const username = document.getElementById('loginUsername')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        const remember = document.getElementById('rememberMe')?.checked;

        if (!username || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Имитация задержки сети
            await new Promise(resolve => setTimeout(resolve, 800));

            const user = this.users.get(username);
            
            if (!user) {
                this.showNotification('Пользователь не найден', 'error');
                return;
            }

            // В реальном приложении здесь была бы проверка пароля
            if (password.length < 6) {
                this.showNotification('Неверный пароль', 'error');
                return;
            }

            this.currentUser = { ...user };
            
            if (remember) {
                localStorage.setItem(`${CONFIG.LOCAL_STORAGE_KEY}_session`, JSON.stringify(this.currentUser));
            }

            this.updateUIForUser();
            this.hideModal('authModal');
            this.showNotification('Успешный вход в систему!', 'success');
            this.playSound('notification');

            // Обновление статуса
            this.currentUser.lastSeen = new Date().toISOString();
            this.currentUser.status = 'online';
            this.updateOnlineUsers();

        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('Ошибка входа. Попробуйте позже.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Регистрация
    async register() {
        const username = document.getElementById('registerUsername')?.value.trim();
        const email = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;
        const password2 = document.getElementById('registerPassword2')?.value;
        const acceptTerms = document.getElementById('acceptTerms')?.checked;

        // Валидация
        if (!username || !email || !password || !password2) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (username.length < 3 || username.length > 20) {
            this.showNotification('Имя пользователя должно быть от 3 до 20 символов', 'error');
            return;
        }

        if (this.users.has(username)) {
            this.showNotification('Имя пользователя уже занято', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showNotification('Введите корректный email', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен быть не менее 6 символов', 'error');
            return;
        }

        if (password !== password2) {
            this.showNotification('Пароли не совпадают', 'error');
            return;
        }

        if (!acceptTerms) {
            this.showNotification('Примите условия использования', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Имитация задержки сети
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newUser = {
                id: `user_${Date.now()}`,
                username,
                email,
                avatar: '👨‍🚀',
                bio: 'Новый исследователь космоса',
                level: 1,
                experience: 0,
                friends: [],
                achievements: ['first_message'],
                registeredAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                status: 'online',
                theme: 'default'
            };

            this.users.set(username, newUser);
            this.currentUser = newUser;

            // Сохранение данных
            await this.saveData();
            localStorage.setItem(`${CONFIG.LOCAL_STORAGE_KEY}_session`, JSON.stringify(this.currentUser));

            this.updateUIForUser();
            this.hideModal('registerModal');
            this.showNotification('Регистрация успешна! Добро пожаловать на станцию!', 'success');
            this.playSound('notification');

        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showNotification('Ошибка регистрации. Попробуйте позже.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Выход
    logout() {
        if (this.currentUser) {
            this.currentUser.status = 'offline';
            this.currentUser.lastSeen = new Date().toISOString();
        }

        this.currentUser = null;
        localStorage.removeItem(`${CONFIG.LOCAL_STORAGE_KEY}_session`);
        
        this.updateUIForUser();
        this.showModal('authModal');
        this.showNotification('Вы вышли из системы', 'info');
        this.playSound('notification');
    }

    // Обновление интерфейса для пользователя
    updateUIForUser() {
        const isLoggedIn = !!this.currentUser;

        // Обновление информации о пользователе
        if (isLoggedIn) {
            document.getElementById('currentUsername').textContent = this.currentUser.username;
            document.getElementById('currentAvatar').textContent = this.currentUser.avatar;
            document.getElementById('currentStatus').textContent = 'Онлайн';
            
            // Обновление профиля
            document.getElementById('profileName').textContent = this.currentUser.username;
            document.getElementById('profileAvatarLarge').textContent = this.currentUser.avatar;
            document.getElementById('profileBio').textContent = this.currentUser.bio;
            document.getElementById('profileFriends').textContent = this.currentUser.friends?.length || 0;
            document.getElementById('profileMessages').textContent = this.messages.filter(m => m.userId === this.currentUser.id).length;
            document.getElementById('profileAchievements').textContent = this.currentUser.achievements?.length || 0;
            document.getElementById('joinDate').textContent = new Date(this.currentUser.registeredAt).toLocaleDateString();
            document.getElementById('profileStatus').textContent = this.currentUser.status === 'online' ? 'Онлайн' : 'Оффлайн';
            document.getElementById('profileLevel').textContent = `Уровень ${this.currentUser.level}`;
            
            // Обновление статистики
            document.getElementById('friendCount').textContent = this.currentUser.friends?.length || 0;
            document.getElementById('messageCount').textContent = this.messages.filter(m => m.userId === this.currentUser.id).length;
            document.getElementById('achievementCount').textContent = this.currentUser.achievements?.length || 0;
            
            // Показать элементы для авторизованных пользователей
            document.querySelectorAll('.auth-only').forEach(el => {
                el.style.display = 'block';
            });
            
            // Обновить онлайн индикатор
            const onlineIndicator = document.getElementById('onlineIndicator');
            if (onlineIndicator) {
                onlineIndicator.style.display = 'block';
            }
        } else {
            // Сброс для гостя
            document.getElementById('currentUsername').textContent = 'Гость';
            document.getElementById('currentAvatar').textContent = '👤';
            document.getElementById('currentStatus').textContent = 'Оффлайн';
            
            // Скрыть элементы для авторизованных пользователей
            document.querySelectorAll('.auth-only').forEach(el => {
                el.style.display = 'none';
            });
            
            // Скрыть онлайн индикатор
            const onlineIndicator = document.getElementById('onlineIndicator');
            if (onlineIndicator) {
                onlineIndicator.style.display = 'none';
            }
        }

        // Переключение на главную страницу
        if (!isLoggedIn) {
            this.switchPage('dashboard');
        }
    }

    // Переключение страниц
    switchPage(page) {
        // Обновление активной навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Скрытие всех страниц
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });

        // Показ выбранной страницы
        const pageContent = document.getElementById(`${page}Content`);
        if (pageContent) {
            pageContent.classList.add('active');
            
            // Загрузка данных для страницы
            switch(page) {
                case 'chat':
                    this.loadChatMessages();
                    this.updateOnlineUsers();
                    break;
                case 'friends':
                    this.loadFriends();
                    break;
                case 'profile':
                    this.loadProfile();
                    break;
                case 'games':
                    this.loadGamesPage();
                    break;
            }
        }
    }

    // Переключение разделов бокового меню
    switchSection(section) {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // В реальном приложении здесь загружались бы данные раздела
        this.showNotification(`Раздел "${section}" загружен`, 'info');
    }

    // Переключение вкладок друзей
    switchFriendsTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        this.loadFriends(tab);
    }

    // Переключение вкладок профиля
    switchProfileTab(tab) {
        document.querySelectorAll('.profile-tab').forEach(tabEl => {
            tabEl.classList.toggle('active', tabEl.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    // Переключение разделов редактора профиля
    switchEditorSection(section) {
        document.querySelectorAll('.editor-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });
        
        document.querySelectorAll('.editor-section').forEach(sectionEl => {
            sectionEl.classList.toggle('active', sectionEl.id === `${section}Section`);
        });
    }

    // Показать модальное окно
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Фокус на первом поле ввода
            const firstInput = modal.querySelector('input, textarea, button');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    // Скрыть модальное окно
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Показать уведомление
    showNotification(message, type = 'info', title = null) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;
        
        let icon = 'ℹ️';
        switch(type) {
            case 'success': icon = '✅'; break;
            case 'error': icon = '❌'; break;
            case 'warning': icon = '⚠️'; break;
            case 'info': icon = 'ℹ️'; break;
        }

        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Закрыть">&times;</button>
        `;

        container.appendChild(notification);

        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.removeNotification(notification);
            });
        }

        // Автоматическое закрытие
        setTimeout(() => {
            this.removeNotification(notification);
        }, CONFIG.NOTIFICATION_TIMEOUT);

        // Ограничение количества уведомлений
        const notifications = container.querySelectorAll('.notification');
        if (notifications.length > 5) {
            this.removeNotification(notifications[0]);
        }
    }

    // Удалить уведомление
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    // Отправить сообщение в чат
    async sendMessage() {
        if (!this.currentUser) {
            this.showNotification('Войдите в систему для отправки сообщений', 'error');
            return;
        }

        const chatInput = document.getElementById('chatInput');
        if (!chatInput) return;

        const text = chatInput.value.trim();
        if (!text) return;

        // Ограничение длины
        if (text.length > 500) {
            this.showNotification('Сообщение слишком длинное (макс. 500 символов)', 'error');
            return;
        }

        // Создание сообщения
        const message = {
            id: `msg_${Date.now()}`,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            avatar: this.currentUser.avatar,
            text: this.escapeHtml(text),
            timestamp: new Date().toISOString(),
            type: 'user'
        };

        // Добавление в историю
        this.messages.push(message);
        
        // Ограничение истории
        if (this.messages.length > CONFIG.MAX_MESSAGES) {
            this.messages = this.messages.slice(-CONFIG.MAX_MESSAGES);
        }

        // Сохранение данных
        await this.saveData();

        // Отображение сообщения
        this.addMessageToChat(message);

        // Очистка поля ввода
        chatInput.value = '';
        const charCount = document.getElementById('charCount');
        if (charCount) charCount.textContent = '0/500';

        // Проверка достижений
        this.checkMessageAchievements();

        // Имитация ответов других пользователей
        this.simulateResponses(text);

        // Воспроизведение звука
        this.playSound('message');
    }

    // Добавить сообщение в чат
    addMessageToChat(message) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageEl = document.createElement('div');
        const isOwnMessage = message.userId === this.currentUser?.id;
        const isSystem = message.type === 'system';
        
        messageEl.className = `message ${isOwnMessage ? 'own' : ''} ${isSystem ? 'system' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div class="message-header">
                <div class="message-user">
                    <span>${message.avatar}</span>
                    <strong>${message.username}</strong>
                </div>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${message.text}</div>
            <div class="message-actions">
                <button class="message-action" title="Ответить">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action" title="Реакция">
                    <i class="far fa-smile"></i>
                </button>
                <button class="message-action" title="Копировать">
                    <i class="far fa-copy"></i>
                </button>
            </div>
        `;

        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Обновление статистики чата
        this.updateChatStats();
    }

    // Загрузить сообщения чата
    loadChatMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';
        
        this.messages.forEach(message => {
            this.addMessageToChat(message);
        });

        this.updateChatStats();
    }

    // Обновить статистику чата
    updateChatStats() {
        const totalMessages = document.getElementById('totalMessages');
        const activeUsers = document.getElementById('activeUsers');
        
        if (totalMessages) {
            totalMessages.textContent = this.messages.length;
        }
        
        if (activeUsers) {
            activeUsers.textContent = this.onlineUsers.size;
        }
    }

    // Обновить список онлайн пользователей
    updateOnlineUsers() {
        const onlineUsersContainer = document.getElementById('onlineUsers');
        const onlineCount = document.getElementById('onlineCount');
        
        if (!onlineUsersContainer || !onlineCount) return;

        // Очистка списка
        onlineUsersContainer.innerHTML = '';

        // Добавление текущего пользователя
        if (this.currentUser) {
            this.onlineUsers.add(this.currentUser.username);
        }

        // Добавление демо-пользователей
        const demoUsers = ['Галактика', 'Звездочёт', 'Орион', 'Андромеда', 'Сириус'];
        demoUsers.forEach(user => {
            if (Math.random() > 0.4) {
                this.onlineUsers.add(user);
            }
        });

        // Отображение пользователей
        this.onlineUsers.forEach(username => {
            const userItem = document.createElement('div');
            userItem.className = 'user-list-item online';
            userItem.innerHTML = `
                <div class="status-dot"></div>
                <span>${username}</span>
            `;
            
            userItem.addEventListener('click', () => {
                this.messageUser(username);
            });
            
            onlineUsersContainer.appendChild(userItem);
        });

        onlineCount.textContent = this.onlineUsers.size;
        
        // Обновление счётчика онлайн друзей
        const onlineFriendsCount = document.getElementById('onlineFriendsCount');
        if (onlineFriendsCount) {
            onlineFriendsCount.textContent = this.onlineUsers.size;
        }
    }

    // Имитация ответов на сообщения
    simulateResponses(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Простые триггеры для ответов
        const responses = [
            {
                triggers: ['привет', 'здравствуй', 'хай', 'hello', 'hi'],
                responses: [
                    `Привет, ${this.currentUser?.username}! Как твои космические исследования?`,
                    'Приветствую! Готов к новым открытиям?',
                    'Здравствуй! Что нового в космосе?'
                ]
            },
            {
                triggers: ['как дела', 'как ты', 'how are you'],
                responses: [
                    'Всё отлично, изучаю новые галактики! 🚀',
                    'Прекрасно! Только что обнаружил интересную туманность.',
                    'Хорошо, спасибо! Готовлюсь к новой миссии.'
                ]
            },
            {
                triggers: ['космос', 'space', 'галактика', 'universe'],
                responses: [
                    'Космос бесконечен и полон загадок! 🌌',
                    'Каждый день в космосе происходит что-то удивительное!',
                    'Исследование космоса - величайшее приключение человечества!'
                ]
            },
            {
                triggers: ['погода', 'weather', 'солнце', 'sun'],
                responses: [
                    'На орбите всегда солнечно! ☀️',
                    'Погода в космосе идеальная для исследований!',
                    'Сегодня отличный день для наблюдения за звёздами!'
                ]
            },
            {
                triggers: ['игра', 'game', 'игры', 'games'],
                responses: [
                    'Попробуйте наши космические игры в разделе Игры!',
                    'Игры помогают тренировать реакцию для космических миссий!',
                    'Какую игру вы предпочитаете?'
                ]
            }
        ];

        // Поиск подходящего ответа
        let response = null;
        for (const group of responses) {
            if (group.triggers.some(trigger => lowerMessage.includes(trigger))) {
                response = group.responses[Math.floor(Math.random() * group.responses.length)];
                break;
            }
        }

        // Случайный ответ, если не нашли триггер
        if (!response && Math.random() > 0.7) {
            const randomResponses = [
                'Интересная мысль!',
                'Продолжайте исследовать!',
                'Что вы думаете о новых экзопланетах?',
                'Космическое пространство ждёт новых открытий!',
                'Хорошая тема для обсуждения!'
            ];
            response = randomResponses[Math.floor(Math.random() * randomResponses.length)];
        }

        if (response) {
            // Задержка для реалистичности
            setTimeout(() => {
                const botMessage = {
                    id: `msg_${Date.now()}`,
                    userId: 'bot',
                    username: 'КосмоБот',
                    avatar: '🤖',
                    text: response,
                    timestamp: new Date().toISOString(),
                    type: 'bot'
                };
                
                this.messages.push(botMessage);
                this.addMessageToChat(botMessage);
                this.saveData();
                
                // Уведомление о новом сообщении
                if (document.getElementById('chatContent').classList.contains('active')) {
                    this.playSound('message');
                }
            }, 1000 + Math.random() * 2000);
        }
    }

    // Загрузить друзей
    loadFriends(tab = 'all') {
        const friendsGrid = document.getElementById('friendsGrid');
        const emptyState = document.getElementById('emptyFriends');
        
        if (!friendsGrid || !emptyState) return;

        friendsGrid.innerHTML = '';

        if (!this.currentUser) {
            emptyState.style.display = 'block';
            return;
        }

        // Фильтрация друзей по вкладке
        let friendsToShow = Array.from(this.users.values())
            .filter(user => user.username !== this.currentUser.username);

        switch(tab) {
            case 'online':
                friendsToShow = friendsToShow.filter(user => user.status === 'online');
                break;
            case 'requests':
                // Здесь была бы логика заявок в друзья
                friendsToShow = [];
                break;
            case 'suggested':
                // Здесь были бы рекомендуемые друзья
                friendsToShow = friendsToShow.slice(0, 3);
                break;
        }

        if (friendsToShow.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Отображение друзей
        friendsToShow.forEach(friend => {
            const isAlreadyFriend = this.currentUser.friends?.includes(friend.id);
            
            const friendCard = document.createElement('div');
            friendCard.className = 'friend-card fade-in';
            
            friendCard.innerHTML = `
                <div class="friend-avatar">${friend.avatar}</div>
                <h4>${friend.username}</h4>
                <p>${friend.bio}</p>
                <div class="friend-actions">
                    ${!isAlreadyFriend ? `
                        <button class="btn btn-primary" onclick="app.addFriend('${friend.id}')">
                            <i class="fas fa-user-plus"></i> Добавить
                        </button>
                    ` : `
                        <button class="btn btn-secondary" onclick="app.messageFriend('${friend.username}')">
                            <i class="fas fa-envelope"></i> Написать
                        </button>
                        <button class="btn btn-secondary" onclick="app.removeFriend('${friend.id}')">
                            <i class="fas fa-user-minus"></i> Удалить
                        </button>
                    `}
                </div>
            `;
            
            friendsGrid.appendChild(friendCard);
        });

        // Обновление счетчиков
        this.updateFriendCounters();
    }

    // Поиск друзей
    searchFriends(query) {
        const friendsGrid = document.getElementById('friendsGrid');
        if (!friendsGrid) return;

        const friends = Array.from(this.users.values())
            .filter(user => user.username !== this.currentUser?.username);

        const filteredFriends = friends.filter(user =>
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.bio.toLowerCase().includes(query.toLowerCase())
        );

        // Обновление отображения
        const emptyState = document.getElementById('emptyFriends');
        if (filteredFriends.length === 0) {
            friendsGrid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            
            // Пересоздание карточек (в реальном приложении использовался бы виртуальный скроллинг)
            friendsGrid.innerHTML = '';
            filteredFriends.forEach(friend => {
                // ... создание карточки друга
            });
        }
    }

    // Добавить друга
    addFriend(friendId) {
        if (!this.currentUser) return;

        const friend = Array.from(this.users.values()).find(u => u.id === friendId);
        if (!friend) return;

        if (!this.currentUser.friends) {
            this.currentUser.friends = [];
        }

        if (!this.currentUser.friends.includes(friendId)) {
            this.currentUser.friends.push(friendId);
            this.saveData();
            this.updateUIForUser();
            this.loadFriends();
            
            this.showNotification(`Заявка отправлена ${friend.username}`, 'success');
            this.playSound('notification');
            
            // Проверка достижений
            this.checkFriendAchievements();
        }
    }

    // Удалить друга
    removeFriend(friendId) {
        if (!this.currentUser || !this.currentUser.friends) return;

        const friend = Array.from(this.users.values()).find(u => u.id === friendId);
        if (!friend) return;

        this.currentUser.friends = this.currentUser.friends.filter(id => id !== friendId);
        this.saveData();
        this.updateUIForUser();
        this.loadFriends();
        
        this.showNotification(`${friend.username} удалён из друзей`, 'info');
        this.playSound('notification');
    }

    // Написать другу
    messageFriend(username) {
        this.switchPage('chat');
        
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = `@${username} `;
            chatInput.focus();
        }
    }

    // Обновить счетчики друзей
    updateFriendCounters() {
        const allFriendsCount = document.getElementById('allFriendsCount');
        const onlineFriendsCount = document.getElementById('onlineFriendsCount');
        const requestsCount = document.getElementById('requestsCount');
        
        if (allFriendsCount) {
            allFriendsCount.textContent = this.currentUser?.friends?.length || 0;
        }
        
        if (onlineFriendsCount) {
            const onlineFriends = Array.from(this.users.values())
                .filter(user => 
                    this.currentUser?.friends?.includes(user.id) && 
                    user.status === 'online'
                ).length;
            onlineFriendsCount.textContent = onlineFriends;
        }
        
        if (requestsCount) {
            requestsCount.textContent = '0'; // В реальном приложении здесь был бы счетчик заявок
        }
    }

    // Загрузить профиль
    loadProfile() {
        if (!this.currentUser) return;

        // Загрузка достижений
        this.loadAchievementsList();
        
        // Загрузка активности
        this.loadActivity();
    }

    // Загрузить список достижений
    loadAchievementsList() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        if (!achievementsGrid) return;

        achievementsGrid.innerHTML = '';

        this.achievements.forEach(achievement => {
            const unlocked = this.currentUser?.achievements?.includes(achievement.id) || false;
            
            const achievementCard = document.createElement('div');
            achievementCard.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
            
            achievementCard.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
                <small>${unlocked ? 'Разблокировано' : 'Заблокировано'}</small>
            `;
            
            achievementsGrid.appendChild(achievementCard);
        });
    }

    // Загрузить активность
    loadActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        // Демо-активность
        const activities = [
            {
                icon: '💬',
                text: 'Отправили сообщение в общий чат',
                time: '10 минут назад'
            },
            {
                icon: '🤝',
                text: 'Добавили нового друга: Галактика',
                time: '2 часа назад'
            },
            {
                icon: '🎮',
                text: 'Побили рекорд в игре "Астероидный дождь"',
                time: 'Вчера'
            },
            {
                icon: '⭐',
                text: 'Получили достижение "Первый контакт"',
                time: '3 дня назад'
            }
        ];

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    // Показать редактор профиля
    showProfileEditor() {
        if (!this.currentUser) return;

        // Заполнение полей текущими данными
        const editUsername = document.getElementById('editUsername');
        const editBio = document.getElementById('editBio');
        
        if (editUsername) editUsername.value = this.currentUser.username;
        if (editBio) editBio.value = this.currentUser.bio;

        // Выбор текущего аватара
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.toggle('active', option.dataset.avatar === this.currentUser.avatar);
        });

        // Выбор текущей темы
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === this.currentUser.theme);
        });

        this.showModal('profileModal');
    }

    // Сохранить профиль
    async saveProfile() {
        if (!this.currentUser) return;

        const editUsername = document.getElementById('editUsername');
        const editBio = document.getElementById('editBio');
        const bioCounter = document.getElementById('bioCounter');

        // Обновление данных
        if (editUsername) {
            const newUsername = editUsername.value.trim();
            if (newUsername && newUsername !== this.currentUser.username) {
                // Проверка уникальности имени
                if (this.users.has(newUsername) && newUsername !== this.currentUser.username) {
                    this.showNotification('Имя пользователя уже занято', 'error');
                    return;
                }
                
                // Удаление старого пользователя и добавление нового
                this.users.delete(this.currentUser.username);
                this.currentUser.username = newUsername;
                this.users.set(newUsername, this.currentUser);
            }
        }

        if (editBio) {
            this.currentUser.bio = editBio.value.trim();
            if (bioCounter) {
                bioCounter.textContent = `${editBio.value.length}/200`;
            }
        }

        // Сохранение данных
        await this.saveData();
        
        // Обновление интерфейса
        this.updateUIForUser();
        
        // Закрытие модального окна
        this.hideModal('profileModal');
        
        // Уведомление
        this.showNotification('Профиль успешно обновлён', 'success');
        this.playSound('notification');
    }

    // Выбрать аватар
    selectAvatar(avatar) {
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.toggle('active', option.dataset.avatar === avatar);
        });
        
        this.currentUser.avatar = avatar;
        
        // Предпросмотр
        document.getElementById('currentAvatar').textContent = avatar;
        document.getElementById('profileAvatarLarge').textContent = avatar;
    }

    // Выбрать тему
    selectTheme(theme) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
        
        this.theme = theme;
        this.currentUser.theme = theme;
        this.applyTheme(theme);
    }

    // Применить тему
    applyTheme(theme) {
        const root = document.documentElement;
        
        switch(theme) {
            case 'purple':
                root.style.setProperty('--primary-dark', '#2a0a4a');
                root.style.setProperty('--primary-medium', '#4a1a6a');
                root.style.setProperty('--accent-cyan', '#cc00ff');
                break;
            case 'green':
                root.style.setProperty('--primary-dark', '#0a2a1a');
                root.style.setProperty('--primary-medium', '#1a3a2a');
                root.style.setProperty('--accent-cyan', '#00ff9d');
                break;
            default:
                // Сброс к значениям по умолчанию
                root.style.setProperty('--primary-dark', '#0a0a2a');
                root.style.setProperty('--primary-medium', '#1a1a3a');
                root.style.setProperty('--accent-cyan', '#00f3ff');
        }
    }

    // Инициализация звуков
    initSounds() {
        if (!CONFIG.SOUND_ENABLED) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Базовые звуки
            this.sounds.set('notification', this.createBeepSound(800, 0.3));
            this.sounds.set('message', this.createBeepSound(600, 0.2));
            this.sounds.set('click', this.createBeepSound(400, 0.1));
            
        } catch (error) {
            console.warn('Аудио не поддерживается:', error);
            CONFIG.SOUND_ENABLED = false;
        }
    }

    // Создать звуковой сигнал
    createBeepSound(frequency, duration) {
        return () => {
            if (!this.audioContext || !CONFIG.SOUND_ENABLED) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    // Воспроизвести звук
    playSound(soundName) {
        if (!CONFIG.SOUND_ENABLED) return;
        
        const sound = this.sounds.get(soundName);
        if (sound) {
            try {
                sound();
            } catch (error) {
                console.warn('Ошибка воспроизведения звука:', error);
            }
        }
    }

    // Переключить звук
    toggleSound() {
        CONFIG.SOUND_ENABLED = !CONFIG.SOUND_ENABLED;
        
        const toggleBtn = document.getElementById('toggleSound');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = CONFIG.SOUND_ENABLED ? 'fas fa-volume-up' : 'fas fa-volume-mute';
            }
        }
        
        this.showNotification(
            CONFIG.SOUND_ENABLED ? 'Звук включён' : 'Звук выключен',
            'info'
        );
    }

    // Очистить чат
    clearChat() {
        if (!confirm('Вы уверены, что хотите очистить историю чата?')) return;
        
        this.messages = this.messages.filter(msg => msg.type === 'system');
        this.saveData();
        this.loadChatMessages();
        
        this.showNotification('История чата очищена', 'success');
        this.playSound('notification');
    }

    // Проверка достижений для сообщений
    checkMessageAchievements() {
        if (!this.currentUser) return;

        const userMessages = this.messages.filter(msg => 
            msg.userId === this.currentUser.id && msg.type === 'user'
        ).length;

        // "Мастер общения" - 100 сообщений
        if (userMessages >= 100 && !this.currentUser.achievements.includes('chat_master')) {
            this.currentUser.achievements.push('chat_master');
            this.unlockAchievement('chat_master');
        }
        
        // "Первый контакт" - первое сообщение
        if (userMessages >= 1 && !this.currentUser.achievements.includes('first_message')) {
            this.currentUser.achievements.push('first_message');
            this.unlockAchievement('first_message');
        }
    }

    // Проверка достижений для друзей
    checkFriendAchievements() {
        if (!this.currentUser) return;

        const friendCount = this.currentUser.friends?.length || 0;

        // "Космический дипломат" - первый друг
        if (friendCount >= 1 && !this.currentUser.achievements.includes('friend_maker')) {
            this.currentUser.achievements.push('friend_maker');
            this.unlockAchievement('friend_maker');
        }
        
        // "Социальная бабочка" - 10 друзей
        if (friendCount >= 10 && !this.currentUser.achievements.includes('social')) {
            this.currentUser.achievements.push('social');
            this.unlockAchievement('social');
        }
    }

    // Разблокировать достижение
    unlockAchievement(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement) return;

        achievement.unlocked = true;
        
        // Показ уведомления о достижении
        this.showNotification(
            `Достижение разблокировано: ${achievement.name}`,
            'success',
            '🎉 Новое достижение!'
        );
        
        this.playSound('notification');
        
        // Обновление интерфейса
        this.updateUIForUser();
        this.loadAchievementsList();
        
        // Сохранение данных
        this.saveData();
    }

    // Загрузить страницу игр
    loadGamesPage() {
        // Обновление статистики игр
        const games = Array.from(this.games.values());
        
        games.forEach(game => {
            const highScoreEl = document.getElementById(`${game.id}HighScore`);
            const playersEl = document.getElementById(`${game.id}Players`);
            
            if (highScoreEl) highScoreEl.textContent = game.highScore;
            if (playersEl) playersEl.textContent = game.players;
        });
        
        // Загрузка таблицы лидеров
        this.loadLeaderboard();
    }

    // Загрузить таблицу лидеров
    loadLeaderboard() {
        const leaderboardEl = document.getElementById('leaderboard');
        if (!leaderboardEl) return;

        // Демо-данные лидерборда
        const leaders = [
            { rank: 1, username: 'Космонавт', avatar: '👨‍🚀', score: 12500 },
            { rank: 2, username: 'Галактика', avatar: '🌌', score: 8500 },
            { rank: 3, username: 'Звездочёт', avatar: '⭐', score: 7200 },
            { rank: 4, username: 'Орион', avatar: '🔭', score: 6800 },
            { rank: 5, username: 'Андромеда', avatar: '🌠', score: 5400 }
        ];

        leaderboardEl.innerHTML = leaders.map(leader => `
            <div class="leaderboard-item rank-${leader.rank}">
                <div class="rank">${leader.rank}</div>
                <div class="player-info">
                    <div class="player-avatar">${leader.avatar}</div>
                    <div class="player-name">${leader.username}</div>
                </div>
                <div class="player-score">${leader.score.toLocaleString()}</div>
            </div>
        `).join('');
    }

    // Запустить фоновые задачи
    startBackgroundTasks() {
        // Проверка неактивности
        setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivity;
            if (inactiveTime > 300000) { // 5 минут
                this.currentUser.status = 'away';
                this.updateUIForUser();
            }
        }, 60000); // Проверка каждую минуту

        // Обновление онлайн статуса
        setInterval(() => {
            this.updateOnlineUsers();
        }, 30000); // Каждые 30 секунд

        // Автосохранение
        setInterval(() => {
            this.saveData();
        }, 60000); // Каждую минуту
    }

    // Показать модальное окно добавления друга
    showAddFriendModal() {
        // В реальном приложении здесь была бы форма поиска и добавления друзей
        this.showNotification('Функция добавления друзей в разработке', 'info');
    }

    // Отправить сообщение пользователю
    messageUser(username) {
        this.switchPage('chat');
        
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = `@${username} `;
            chatInput.focus();
        }
    }

    // Валидация email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Логирование (только в режиме отладки)
    log(...args) {
        if (CONFIG.DEBUG) {
            console.log(`[${CONFIG.APP_NAME}]`, ...args);
        }
    }

    // Игры
    startAsteroids() {
        const canvas = document.getElementById('asteroidsPreview');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Очистка canvas
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Демо-отрисовка астероидов
        const drawAsteroid = (x, y, size) => {
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = '#9d00ff';
            ctx.fill();
            
            // Свечение
            ctx.beginPath();
            ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(157, 0, 255, 0.3)';
            ctx.fill();
        };

        // Анимация
        let frame = 0;
        const animate = () => {
            // Очистка с эффектом затухания
            ctx.fillStyle = 'rgba(10, 10, 42, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Отрисовка астероидов
            const asteroidCount = 5;
            for (let i = 0; i < asteroidCount; i++) {
                const angle = (frame * 0.01) + (i * Math.PI * 2 / asteroidCount);
                const x = canvas.width / 2 + Math.cos(angle) * 50;
                const y = canvas.height / 2 + Math.sin(angle) * 30;
                const size = 10 + Math.sin(frame * 0.02 + i) * 3;
                
                drawAsteroid(x, y, size);
            }

            // Корабль игрока
            const shipSize = 8;
            const shipX = canvas.width / 2;
            const shipY = canvas.height / 2;
            
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.moveTo(shipX, shipY - shipSize);
            ctx.lineTo(shipX - shipSize, shipY + shipSize);
            ctx.lineTo(shipX + shipSize, shipY + shipSize);
            ctx.closePath();
            ctx.fill();

            frame++;
            requestAnimationFrame(animate);
        };

        animate();

        // Переключение на полноценную игру
        setTimeout(() => {
            this.showNotification('Запуск игры "Астероидный дождь"', 'info');
            // В реальном приложении здесь была бы полноценная игра
        }, 500);
    }

    startQuiz() {
        const quizQuestions = [
            {
                question: 'Какая планета самая большая в Солнечной системе?',
                answers: ['Земля', 'Юпитер', 'Сатурн', 'Марс'],
                correct: 1
            },
            {
                question: 'Что такое черная дыра?',
                answers: ['Темная планета', 'Облако газа', 'Объект с огромной гравитацией', 'Погасшая звезда'],
                correct: 2
            },
            {
                question: 'Сколько планет в Солнечной системе?',
                answers: ['7', '8', '9', '10'],
                correct: 1
            },
            {
                question: 'Как называется галактика, в которой мы живем?',
                answers: ['Андромеда', 'Млечный Путь', 'Треугольник', 'Сигара'],
                correct: 1
            },
            {
                question: 'Что такое нейтронная звезда?',
                answers: ['Молодая звезда', 'Остаток сверхновой', 'Планета-гигант', 'Облако пыли'],
                correct: 1
            }
        ];

        let currentQuestion = 0;
        let score = 0;

        const showQuestion = () => {
            const question = quizQuestions[currentQuestion];
            const quizQuestionEl = document.getElementById('quizQuestion');
            const quizAnswersEl = document.getElementById('quizAnswers');

            if (!quizQuestionEl || !quizAnswersEl) return;

            quizQuestionEl.textContent = question.question;
            quizAnswersEl.innerHTML = '';

            question.answers.forEach((answer, index) => {
                const button = document.createElement('button');
                button.textContent = answer;
                button.onclick = () => checkAnswer(index);
                quizAnswersEl.appendChild(button);
            });
        };

        const checkAnswer = (selected) => {
            const question = quizQuestions[currentQuestion];
            const buttons = document.querySelectorAll('#quizAnswers button');
            
            // Подсветка правильного и неправильного ответов
            buttons.forEach((button, index) => {
                if (index === question.correct) {
                    button.classList.add('correct');
                } else if (index === selected && index !== question.correct) {
                    button.classList.add('incorrect');
                }
                button.disabled = true;
            });

            if (selected === question.correct) {
                score++;
                this.playSound('notification');
            }

            setTimeout(() => {
                currentQuestion++;
                if (currentQuestion < quizQuestions.length) {
                    showQuestion();
                } else {
                    endQuiz();
                }
            }, 1500);
        };

        const endQuiz = () => {
            const quizQuestionEl = document.getElementById('quizQuestion');
            const quizAnswersEl = document.getElementById('quizAnswers');

            if (!quizQuestionEl || !quizAnswersEl) return;

            quizQuestionEl.textContent = `Викторина завершена! Ваш результат: ${score} из ${quizQuestions.length}`;
            quizAnswersEl.innerHTML = '';

            // Обновление статистики
            const quizCorrectEl = document.getElementById('quizCorrect');
            if (quizCorrectEl) {
                const percentage = Math.round((score / quizQuestions.length) * 100);
                quizCorrectEl.textContent = `${percentage}%`;
            }

            // Проверка достижения
            if (score === quizQuestions.length && this.currentUser) {
                if (!this.currentUser.achievements.includes('gamer')) {
                    this.currentUser.achievements.push('gamer');
                    this.unlockAchievement('gamer');
                }
            }

            this.showNotification(`Результат викторины: ${score}/${quizQuestions.length}`, 'success');
        };

        showQuestion();
    }

    startSpaceRace() {
        this.showNotification('Игра "Космическая гонка" скоро будет доступна!', 'info');
        this.playSound('notification');
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new SpaceStationApp();
    
    // Глобальный доступ к приложению (только для разработки)
    if (CONFIG.DEBUG) {
        window.app = app;
    }
    
    // Добавление CSS анимаций
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease;
        }
        
        .slide-up {
            animation: slideUp 0.5s ease;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: rgba(42, 42, 74, 0.5);
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            animation: fadeIn 0.3s ease;
        }
        
        .activity-icon {
            font-size: 1.5rem;
            width: 3rem;
            height: 3rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 243, 255, 0.1);
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-text {
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }
        
        .activity-time {
            color: var(--text-muted);
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
});