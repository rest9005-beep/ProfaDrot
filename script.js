// ==========================================================================
// КОСМИЧЕСКАЯ СТАНЦИЯ - Упрощенная версия
// ==========================================================================

'use strict';

class SpaceStation {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.users = new Map();
        this.onlineUsers = new Set();
        
        this.init();
    }

    async init() {
        // Загрузка данных
        await this.loadData();
        
        // Настройка событий
        this.setupEventListeners();
        
        // Инициализация звездного фона
        this.initStarCanvas();
        
        // Проверка существующей сессии
        this.checkSession();
    }

    initStarCanvas() {
        const canvas = document.getElementById('starCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const stars = [];
        
        // Создание звезд
        const createStars = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            stars.length = 0;
            const starCount = Math.min(300, Math.floor((canvas.width * canvas.height) / 4000));
            
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speed: Math.random() * 0.3 + 0.1,
                    brightness: Math.random() * 0.5 + 0.5
                });
            }
        };
        
        // Анимация звезд
        const animate = () => {
            ctx.fillStyle = 'rgba(10, 10, 22, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            stars.forEach(star => {
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
                
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
                ctx.fill();
            });
            
            requestAnimationFrame(animate);
        };
        
        window.addEventListener('resize', createStars);
        createStars();
        animate();
    }

    setupEventListeners() {
        // Регистрация
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // Чат
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Игры
        window.startGame = (game) => {
            this.startGame(game);
        };
    }

    async loadData() {
        // Загрузка сообщений из localStorage
        const savedMessages = localStorage.getItem('spaceStation_messages');
        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
        }
        
        // Загрузка пользователей
        const savedUsers = localStorage.getItem('spaceStation_users');
        if (savedUsers) {
            const users = JSON.parse(savedUsers);
            users.forEach(user => {
                this.users.set(user.username, user);
            });
        }
        
        // Демо-пользователи
        if (this.users.size === 0) {
            const demoUsers = [
                { username: 'Космонавт', joined: '2023-01-15' },
                { username: 'Галактика', joined: '2023-03-20' },
                { username: 'Звездочёт', joined: '2023-02-10' }
            ];
            
            demoUsers.forEach(user => {
                this.users.set(user.username, user);
            });
            
            // Демо-сообщения
            this.messages = [
                {
                    username: 'Система',
                    text: 'Добро пожаловать в космический чат! Здесь вы можете общаться с другими исследователями.',
                    time: new Date().toISOString()
                },
                {
                    username: 'Космонавт',
                    text: 'Привет всем! Сегодня наблюдал за туманностью Ориона. Невероятное зрелище!',
                    time: new Date(Date.now() - 3600000).toISOString()
                }
            ];
            
            await this.saveData();
        }
    }

    async saveData() {
        localStorage.setItem('spaceStation_messages', JSON.stringify(this.messages));
        localStorage.setItem('spaceStation_users', JSON.stringify(Array.from(this.users.values())));
    }

    checkSession() {
        const session = localStorage.getItem('spaceStation_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            this.showApp();
        }
    }

    async register() {
        const usernameInput = document.getElementById('registerUsername');
        const username = usernameInput.value.trim();
        
        if (!username || username.length < 2) {
            this.showNotification('Введите имя пользователя (минимум 2 символа)', 'error');
            return;
        }
        
        if (this.users.has(username)) {
            this.showNotification('Это имя уже занято. Выберите другое.', 'error');
            return;
        }
        
        // Создание пользователя
        this.currentUser = {
            username,
            joined: new Date().toISOString(),
            stats: {
                messages: 0,
                games: 0,
                days: 1
            }
        };
        
        // Сохранение
        this.users.set(username, this.currentUser);
        localStorage.setItem('spaceStation_session', JSON.stringify(this.currentUser));
        await this.saveData();
        
        // Показать приложение
        this.showApp();
        this.showNotification(`Добро пожаловать, ${username}! 🚀`, 'success');
    }

    showApp() {
        document.getElementById('authModal').classList.remove('active');
        document.getElementById('appContainer').classList.remove('hidden');
        
        // Обновить информацию пользователя
        document.getElementById('currentUsername').textContent = this.currentUser.username;
        document.getElementById('profileName').textContent = this.currentUser.username;
        
        // Загрузить чат
        this.loadChat();
        this.updateOnlineUsers();
        
        // Переключить на чат
        this.switchPage('chat');
    }

    switchPage(page) {
        // Обновить активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        // Показать выбранную страницу
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.toggle('active', pageEl.id === `${page}Page`);
        });
    }

    async sendMessage() {
        if (!this.currentUser) return;
        
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        if (text.length > 500) {
            this.showNotification('Сообщение слишком длинное (макс. 500 символов)', 'error');
            return;
        }
        
        // Создать сообщение
        const message = {
            username: this.currentUser.username,
            text: this.escapeHtml(text),
            time: new Date().toISOString()
        };
        
        // Добавить в историю
        this.messages.push(message);
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }
        
        // Сохранить
        await this.saveData();
        
        // Показать сообщение
        this.addMessageToChat(message);
        
        // Очистить поле ввода
        input.value = '';
        
        // Обновить статистику
        this.currentUser.stats.messages++;
        this.updateProfileStats();
        
        // Имитация ответов
        this.simulateResponse(text);
    }

    addMessageToChat(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const time = new Date(message.time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.innerHTML = `
            <div class="message-header">
                <div class="message-user">${message.username}</div>
                <div class="message-time">${time}</div>
            </div>
            <div class="message-text">${message.text}</div>
        `;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    loadChat() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = '';
        this.messages.forEach(message => {
            this.addMessageToChat(message);
        });
    }

    updateOnlineUsers() {
        // Демо-пользователи онлайн
        const demoUsers = ['Космонавт', 'Галактика', 'Звездочёт', 'Орион', 'Андромеда'];
        const onlineCount = Math.floor(Math.random() * demoUsers.length) + 1;
        
        const onlineElement = document.getElementById('onlineCount');
        if (onlineElement) {
            onlineElement.textContent = onlineCount + 1; // + текущий пользователь
        }
    }

    simulateResponse(userMessage) {
        const responses = [
            "Привет! Как твои космические исследования?",
            "Интересная мысль! Продолжайте исследовать!",
            "Космическое пространство ждет новых открытий!",
            "Что вы думаете о новых экзопланетах?",
            "Хорошая тема для обсуждения! 🚀"
        ];
        
        if (Math.random() > 0.5) {
            setTimeout(() => {
                const randomUser = ['Космонавт', 'Галактика', 'Звездочёт'][Math.floor(Math.random() * 3)];
                const response = responses[Math.floor(Math.random() * responses.length)];
                
                const message = {
                    username: randomUser,
                    text: response,
                    time: new Date().toISOString()
                };
                
                this.messages.push(message);
                this.addMessageToChat(message);
                this.saveData();
            }, 1000 + Math.random() * 2000);
        }
    }

    startGame(game) {
        switch(game) {
            case 'asteroids':
                this.showNotification('Запускаем Астероидный Дождь!', 'success');
                // В реальном приложении здесь был бы запуск игры
                break;
            case 'quiz':
                this.startQuiz();
                break;
            case 'race':
                this.showNotification('Космическая Гонка скоро будет доступна!', 'info');
                break;
        }
    }

    startQuiz() {
        const questions = [
            {
                question: 'Какая планета самая большая в Солнечной системе?',
                answer: 'Юпитер'
            },
            {
                question: 'Что такое черная дыра?',
                answer: 'Объект с огромной гравитацией'
            },
            {
                question: 'Сколько планет в Солнечной системе?',
                answer: '8'
            }
        ];
        
        const question = questions[Math.floor(Math.random() * questions.length)];
        const userAnswer = prompt(question.question);
        
        if (userAnswer && userAnswer.toLowerCase().includes(question.answer.toLowerCase())) {
            this.showNotification('Правильно! 🎉', 'success');
        } else {
            this.showNotification(`Правильный ответ: ${question.answer}`, 'info');
        }
    }

    updateProfileStats() {
        document.getElementById('messagesSent').textContent = this.currentUser.stats.messages;
        document.getElementById('gamesPlayed').textContent = this.currentUser.stats.games;
        document.getElementById('daysActive').textContent = this.currentUser.stats.days;
    }

    logout() {
        if (confirm('Выйти из космической станции?')) {
            localStorage.removeItem('spaceStation_session');
            location.reload();
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">${message}</div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    // Скрыть загрузку
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1500);
    
    app = new SpaceStation();
});
