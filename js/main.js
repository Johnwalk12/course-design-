// Configuration
const config = {
    sections: ['objectives', 'video', 'vocabulary', 'phrases', 'quiz', 'practice', 'roleplay'],
    currentSection: 0, // Start at first section (Objectives)
    transitionDuration: 300,
    scrollThreshold: 0.3,
    navHeight: 60, // Height of navigation bar
    scrollTolerance: 50, // Scroll tolerance for nav state change
    smoothScrollDuration: 800, // Duration for smooth scrolling in ms
    scrollDebounceTime: 16, // Debounce time for scroll events (16ms = 60fps)
    touchSwipeThreshold: 50, // Minimum distance for swipe detection
    touchSwipeTimeThreshold: 300, // Maximum time for swipe detection
    progressSaveInterval: 30000 // Save progress every 30 seconds
};

// DOM Elements
let sections;
let navLinks;
let progressBar;
let prevButton;
let nextButton;
let mobileMenuToggle;
let navIndicator;
let lastScrollTop = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isScrolling = false;
let scrollTimeout;
let progressSaveInterval;
let lastHeight = 0;

// Error Handling System
const errorSystem = {
    showError: function(message, container, retryCallback) {
        const template = document.getElementById('error-template');
        const errorElement = template.content.cloneNode(true);

        errorElement.querySelector('.error-text').textContent = message;
        if (retryCallback) {
            errorElement.querySelector('.retry-button').addEventListener('click', retryCallback);
        }

        container.innerHTML = '';
        container.appendChild(errorElement);
    },

    showFallback: function(message, container) {
        const template = document.getElementById('fallback-template');
        const fallbackElement = template.content.cloneNode(true);

        fallbackElement.querySelector('.fallback-text').textContent = message;

        container.innerHTML = '';
        container.appendChild(fallbackElement);
    }
};

// Section Management
const sectionManager = {
    sections: document.querySelectorAll('.section'),

    init: function() {
        this.sections.forEach(section => {
            const header = section.querySelector('.section-header');
            const content = section.querySelector('.section-content');

            if (header && content) {
                header.addEventListener('click', () => {
                    this.toggleSection(section);
                });

                // Add collapse/expand icon
                const icon = document.createElement('i');
                icon.className = 'fas fa-chevron-down section-toggle';
                header.appendChild(icon);
            }
        });
    },

    toggleSection: function(section) {
        const content = section.querySelector('.section-content');
        const icon = section.querySelector('.section-toggle');

        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            icon.style.transform = 'rotate(0deg)';
        } else {
            content.style.maxHeight = content.scrollHeight + 'px';
            icon.style.transform = 'rotate(180deg)';
        }
    }
};

// Loading State Management
const loadingManager = {
    showLoading: function(container) {
        container.classList.add('loading');
    },

    hideLoading: function(container) {
        container.classList.remove('loading');
    }
};

// Text-to-Speech System
const speechSystem = {
    speaking: false,
    speechSynth: window.speechSynthesis,
    voice: null,

    init() {
        // Wait for voices to be loaded
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                this.loadVoice();
            };
        }
        this.loadVoice();
    },

    loadVoice() {
        // Get all available voices
        const voices = this.speechSynth.getVoices();

        // Try to find a female English voice
        this.voice = voices.find(voice =>
            voice.lang.includes('en') &&
            voice.name.toLowerCase().includes('female')
        ) || voices.find(voice =>
            voice.lang.includes('en') // Fallback to any English voice
        ) || voices[0]; // Fallback to any available voice
    },

    speak(text, button) {
        // Cancel any ongoing speech
        this.speechSynth.cancel();

        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);

        // Configure speech
        utterance.voice = this.voice;
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.1; // Slightly higher pitch for female voice
        utterance.volume = 1.0;

        // Add event handlers
        utterance.onstart = () => {
            this.speaking = true;
            if (button) {
                button.classList.add('playing');
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-pause';
                }
            }
        };

        utterance.onend = () => {
            this.speaking = false;
            if (button) {
                button.classList.remove('playing');
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = button.classList.contains('vocab-audio') ?
                        'fas fa-volume-up' : 'fas fa-play';
                }
            }
        };

        // Start speaking
        this.speechSynth.speak(utterance);
    },

    stop() {
        this.speechSynth.cancel();
        this.speaking = false;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    sections = document.querySelectorAll('.section');
    navLinks = document.querySelectorAll('.nav-link');
    progressBar = document.querySelector('.progress-bar');
    prevButton = document.getElementById('prev-section');
    nextButton = document.getElementById('next-section');
    mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    navIndicator = document.querySelector('.nav-indicator');

    // Setup navigation
    setupNavigation();
    setupScrollHandling();
    setupMobileMenu();
    setupTouchGestures();
    setupProgressPersistence();
    updateProgress();

    // Always start at the first section (Objectives)
    config.currentSection = 0;
    loadSection(config.currentSection);
    initializeNavIndicator();

    // Initialize section visibility
    sections.forEach((section, index) => {
        section.style.display = index === 0 ? 'block' : 'none';
        if (index === 0) {
            section.classList.add('active');
            updateNavIndicator(0);
        }
    });

    // Initialize section management
    sectionManager.init();

    // Add error handling for quiz system
    const quizContainer = document.querySelector('.quiz-container');
    if (quizContainer) {
        window.addEventListener('error', function(e) {
            if (e.target && e.target.classList && e.target.classList.contains('quiz-option')) {
                errorSystem.showError(
                    'Unable to submit answer. Please try again.',
                    quizContainer,
                    () => {
                        // Retry submitting answer
                        const option = e.target;
                        option.click();
                    }
                );
            }
        });
    }

    // Initialize global audio permission state if not already set
    if (!window.audioPermissionState) {
        window.audioPermissionState = {
            permissionStatus: 'prompt',
            isRequesting: false,
            stream: null
        };
    }

    // Initialize Text-to-Speech system
    speechSystem.init();

    // Initialize vocabulary audio buttons
    document.querySelectorAll('.vocab-audio').forEach(button => {
        const word = button.closest('.vocab-card').querySelector('.vocab-word').textContent;
        button.addEventListener('click', () => {
            if (speechSystem.speaking) {
                speechSystem.stop();
            } else {
                speechSystem.speak(word, button);
            }
        });
    });

    // Initialize example sentence audio buttons
    document.querySelectorAll('.example-audio').forEach(button => {
        const example = button.closest('.example-container').querySelector('.example').textContent;
        button.addEventListener('click', () => {
            if (speechSystem.speaking) {
                speechSystem.stop();
            } else {
                speechSystem.speak(example, button);
            }
        });
    });

    // Initialize phrase audio buttons
    document.querySelectorAll('.phrase-audio').forEach(button => {
        const phrase = button.closest('.phrase-item').querySelector('.phrase').textContent;
        button.addEventListener('click', () => {
            if (speechSystem.speaking) {
                speechSystem.stop();
            } else {
                speechSystem.speak(phrase, button);
            }
        });
    });

    setupCollapsibleActivities();
    setupIframeHeightManagement();

    // Initialize mobile optimizations
    setupMobileOptimizations();
});

// Navigation Setup
function setupNavigation() {
    // Nav Links Click Handlers
    navLinks.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection(index);
        });
    });

    // Next/Previous Buttons
    prevButton.addEventListener('click', () => {
        if (config.currentSection > 0) {
            navigateToSection(config.currentSection - 1);
        }
    });

    nextButton.addEventListener('click', () => {
        if (config.currentSection < config.sections.length - 1) {
            navigateToSection(config.currentSection + 1);
        }
    });

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && config.currentSection > 0) {
            navigateToSection(config.currentSection - 1);
        }
        if (e.key === 'ArrowRight' && config.currentSection < config.sections.length - 1) {
            navigateToSection(config.currentSection + 1);
        }
    });
}

// Scroll Handling
function setupScrollHandling() {
    // Use Intersection Observer for better performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= config.scrollThreshold) {
                const sectionIndex = Array.from(sections).indexOf(entry.target);
                updateActiveNavLink(sectionIndex);
                updateNavIndicator(sectionIndex);
                saveProgress(sectionIndex);
            }
        });
    }, {
        threshold: config.scrollThreshold
    });

    sections.forEach(section => observer.observe(section));

    // Add scroll behavior for navigation bar
    window.addEventListener('scroll', () => {
        // Debounce scroll events for better performance
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const currentScroll = window.pageYOffset;
            const nav = document.querySelector('.lesson-nav');

            // Add/remove scrolled class based on scroll position
            if (currentScroll > config.navHeight) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            // Hide/show navigation based on scroll direction
            if (currentScroll > lastScrollTop && currentScroll > config.navHeight) {
                // Scrolling down
                nav.style.transform = `translateY(-${config.navHeight}px)`;
            } else {
                // Scrolling up
                nav.style.transform = 'translateY(0)';
            }

            lastScrollTop = currentScroll;
        }, config.scrollDebounceTime);
    });
}

// Touch Gesture Support
function setupTouchGestures() {
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;

        // Check if it's a horizontal swipe (not a scroll)
        if (Math.abs(deltaX) > Math.abs(deltaY) &&
            Math.abs(deltaX) > config.touchSwipeThreshold &&
            deltaTime < config.touchSwipeTimeThreshold) {

            // Prevent default to avoid page scrolling
            e.preventDefault();

            // Swipe left (next section)
            if (deltaX < 0 && config.currentSection < config.sections.length - 1) {
                navigateToSection(config.currentSection + 1);
            }
            // Swipe right (previous section)
            else if (deltaX > 0 && config.currentSection > 0) {
                navigateToSection(config.currentSection - 1);
            }
        }
    });
}

// Progress Persistence
function setupProgressPersistence() {
    // Load saved progress on page load
    loadProgress();

    // Set up interval to save progress
    progressSaveInterval = setInterval(() => {
        saveProgress(config.currentSection);
    }, config.progressSaveInterval);

    // Save progress when user leaves the page
    window.addEventListener('beforeunload', () => {
        saveProgress(config.currentSection);
    });
}

// Navigation Functions
function navigateToSection(index) {
    if (index < 0 || index >= config.sections.length) return;

    // Close mobile menu if open
    document.querySelector('.nav-list').classList.remove('active');
    mobileMenuToggle.classList.remove('active');

    // Hide current section
    const currentSection = sections[config.currentSection];
    currentSection.classList.remove('active');
    currentSection.classList.add('fade-out');

    setTimeout(() => {
        currentSection.style.display = 'none';
        currentSection.classList.remove('fade-out');

        // Show new section
        const newSection = sections[index];
        newSection.style.display = 'block';
        newSection.classList.add('active', 'fade-in');

        setTimeout(() => {
            newSection.classList.remove('fade-in');
        }, config.transitionDuration);

        // Update state
        config.currentSection = index;
        updateActiveNavLink(index);
        updateNavIndicator(index);
        updateNavigationButtons();
        updateProgress();
        saveProgress(index);

        // Update progress indicator
        const navItem = navLinks[index].closest('.nav-item');
        navItem.classList.add('completed');

        // Smooth scroll to section
        smoothScrollToSection(newSection);
    }, config.transitionDuration);
}

// Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Mobile Optimization Functions
function setupMobileOptimizations() {
    setupTouchHandling();
    setupScrollOptimization();
    setupMobileNavigation();
}

function setupTouchHandling() {
    document.addEventListener('touchstart', (e) => {
        // Store touch start position
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;

        // Check if it's a horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) &&
            Math.abs(deltaX) > config.touchSwipeThreshold &&
            deltaTime < config.touchSwipeTimeThreshold) {

            if (deltaX < 0 && config.currentSection < config.sections.length - 1) {
                navigateToSection(config.currentSection + 1);
            } else if (deltaX > 0 && config.currentSection > 0) {
                navigateToSection(config.currentSection - 1);
            }
        }
    });
}

function setupScrollOptimization() {
    let lastScroll = 0;
    const scrollHandler = debounce(() => {
        const currentScroll = window.pageYOffset;
        const nav = document.querySelector('.lesson-nav');

        if (currentScroll > lastScroll && currentScroll > 60) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    }, 16);

    window.addEventListener('scroll', scrollHandler, { passive: true });
}

function setupMobileNavigation() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');

    if (mobileMenuToggle && navList) {
        mobileMenuToggle.addEventListener('click', () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            navList.classList.toggle('active');
            document.body.style.overflow = isExpanded ? '' : 'hidden';
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navList.classList.contains('active') &&
                !navList.contains(e.target) &&
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                navList.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// Smooth scrolling implementation
function smoothScrollToSection(section) {
    const targetPosition = section.offsetTop - config.navHeight;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / config.smoothScrollDuration, 1);

        // Easing function (ease-out-cubic)
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
        const run = easeOutCubic(progress);

        window.scrollTo(0, startPosition + distance * run);

        if (timeElapsed < config.smoothScrollDuration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

// Update Functions
function updateActiveNavLink(index) {
    navLinks.forEach((link, i) => {
        link.classList.toggle('active', i === index);
    });
}

function updateNavigationButtons() {
    prevButton.disabled = config.currentSection === 0;
    nextButton.disabled = config.currentSection === config.sections.length - 1;
}

function updateProgress() {
    const progress = ((config.currentSection + 1) / config.sections.length) * 100;
    progressBar.style.width = `${progress}%`;
}

// Progress Management
function saveProgress(sectionIndex) {
    try {
        localStorage.setItem('currentSection', sectionIndex);
        localStorage.setItem('lastAccessed', Date.now());

        // Save completion status for each section
        const completedSections = {};
        sections.forEach((section, index) => {
            completedSections[index] = index <= sectionIndex;
        });
        localStorage.setItem('completedSections', JSON.stringify(completedSections));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

function loadProgress() {
    try {
        const savedSection = localStorage.getItem('currentSection');
        if (savedSection !== null) {
            const sectionIndex = parseInt(savedSection);
            if (sectionIndex >= 0 && sectionIndex < config.sections.length) {
                navigateToSection(sectionIndex);
            }
        }

        // Load completion status for each section
        const completedSections = JSON.parse(localStorage.getItem('completedSections') || '{}');
        Object.entries(completedSections).forEach(([index, completed]) => {
            if (completed) {
                const navItem = navLinks[parseInt(index)].closest('.nav-item');
                navItem.classList.add('completed');
            }
        });
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Section Loading
function loadSection(index) {
    const section = sections[index];
    if (!section) return;

    // Add loading state
    section.classList.add('loading');

    // Simulate content loading (replace with actual content loading logic)
    setTimeout(() => {
        section.classList.remove('loading');
    }, 500);
}

// Animation Classes
document.documentElement.style.setProperty('--transition-duration', `${config.transitionDuration}ms`);

// Add these CSS classes dynamically
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        animation: fadeIn var(--transition-duration) ease forwards;
    }
    .fade-out {
        animation: fadeOut var(--transition-duration) ease forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    
    /* Loading animation */
    .loading {
        position: relative;
        min-height: 200px;
    }
    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        margin: -20px 0 0 -20px;
        border: 4px solid rgba(255, 215, 0, 0.2);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    /* Touch feedback */
    .touch-feedback {
        position: relative;
        overflow: hidden;
    }
    .touch-feedback::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 5px;
        height: 5px;
        background: rgba(255, 255, 255, 0.5);
        opacity: 0;
        border-radius: 100%;
        transform: scale(1, 1) translate(-50%);
        transform-origin: 50% 50%;
    }
    .touch-feedback:active::after {
        animation: ripple 0.6s ease-out;
    }
    @keyframes ripple {
        0% {
            transform: scale(0, 0);
            opacity: 0.5;
        }
        100% {
            transform: scale(20, 20);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Add these new functions
function setupMobileMenu() {
    if (!mobileMenuToggle) return;

    const navList = document.querySelector('.nav-list');
    const body = document.body;

    mobileMenuToggle.addEventListener('click', () => {
        const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
        mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
        navList.classList.toggle('show');
        body.style.overflow = !isExpanded ? 'hidden' : '';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navList.classList.contains('show') &&
            !navList.contains(e.target) &&
            !mobileMenuToggle.contains(e.target)) {
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            navList.classList.remove('show');
            body.style.overflow = '';
        }
    });

    // Close menu when clicking a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navList.classList.contains('show')) {
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                navList.classList.remove('show');
                body.style.overflow = '';
            }
        });
    });
}

function initializeNavIndicator() {
    if (!navIndicator) return;

    navLinks.forEach((link, index) => {
        if (index === config.currentSection) {
            updateNavIndicator(index);
        }
    });
}

function updateNavIndicator(index) {
    if (!navIndicator) return;

    const activeLink = navLinks[index];
    if (!activeLink) return;

    const linkRect = activeLink.getBoundingClientRect();
    const navRect = activeLink.closest('.nav-list').getBoundingClientRect();

    navIndicator.style.width = `${linkRect.width}px`;
    navIndicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
}

// Collapsible Activities
function setupCollapsibleActivities() {
    const collapsibles = document.querySelectorAll('.practice-container.collapsible');

    collapsibles.forEach(container => {
        const header = container.querySelector('.activity-header');
        const content = container.querySelector('.activity-content');

        if (header && content) {
            header.addEventListener('click', () => {
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                header.setAttribute('aria-expanded', !isExpanded);
                content.classList.toggle('expanded');
            });

            // Handle keyboard navigation
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });
        }
    });
}

// Initialize iframe height management
function setupIframeHeightManagement() {
    const heightObserver = new ResizeObserver(([entry]) => {
        const newHeight = entry.contentRect.height;
        if (Math.abs(newHeight - lastHeight) > 10) {
            lastHeight = newHeight;
            setTimeout(() => {
                window.parent.postMessage({
                    action: "iframeHeightUpdated",
                    height: newHeight + 50,
                    id: 'lessonContent'
                }, '*');
            }, 100);
        }
    });

    const contentContainer = document.querySelector('.lesson-container');
    if (contentContainer) {
        heightObserver.observe(contentContainer);
    }

    // Initial height setup
    const sendHeight = () => {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({
            action: "setHeight",
            height: height + 50,
            source: "lessonContent"
        }, '*');
    };

    // Send height on load and after any dynamic content changes
    sendHeight();
    window.addEventListener('load', sendHeight);
    window.addEventListener('resize', debounce(sendHeight, 250));
}