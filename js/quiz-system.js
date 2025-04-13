// Quiz System Configuration
const QuizSystem = {
        config: {
            transitionDuration: 300,
            feedbackDelay: 1000,
            minCorrectToPass: 0.7, // 70% to pass
            animations: {
                slideIn: 'slideInRight',
                slideOut: 'slideOutLeft',
                fadeIn: 'fadeIn',
                fadeOut: 'fadeOut'
            },
            autoAdvance: true, // Enable automatic advancement
            immediateFeedback: true, // Show immediate feedback
            feedbackDuration: 1500, // Duration to show feedback before auto-advancing
            showExplanations: true,
            enableTimer: true,
            timerDuration: 300, // 5 minutes per question
            enableReview: true,
            showProgressBar: true,
            enableKeyboardNavigation: true,
            enableHints: true,
            maxHints: 2
        },

        state: {
            currentQuestion: 0,
            score: 0,
            answers: [],
            isSubmitted: false,
            questions: [],
            timeStarted: null,
            timeCompleted: null,
            timer: null,
            hintsUsed: 0,
            reviewMode: false
        },

        // Initialize Quiz System
        init() {
            this.loadQuestions();
            this.setupEventListeners();
            this.updateProgress();
            this.showCurrentQuestion();
            this.state.timeStarted = new Date();
            this.setupTimer();
        },

        // Load questions from data attribute or API
        loadQuestions() {
            const quizContainer = document.querySelector('.quiz-container');
            if (!quizContainer) return;

            this.state.questions = Array.from(quizContainer.querySelectorAll('.quiz-question')).map(question => ({
                element: question,
                text: question.querySelector('.question-text').textContent,
                explanation: question.dataset.explanation || '',
                hint: question.dataset.hint || '',
                options: Array.from(question.querySelectorAll('.quiz-option')).map(option => ({
                    element: option,
                    text: option.querySelector('.option-text').textContent,
                    isCorrect: option.dataset.correct === 'true',
                    explanation: option.dataset.explanation || ''
                }))
            }));

            document.querySelector('.total-questions').textContent = this.state.questions.length;
        },

        // Setup Event Listeners
        setupEventListeners() {
            document.querySelectorAll('.quiz-option').forEach(option => {
                option.addEventListener('click', () => this.handleOptionSelect(option));
                option.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleOptionSelect(option);
                    }
                });
            });

            const prevButton = document.querySelector('.prev-question');
            const nextButton = document.querySelector('.next-question');
            if (prevButton) prevButton.addEventListener('click', () => this.navigateQuestion(-1));
            if (nextButton) nextButton.addEventListener('click', () => this.navigateQuestion(1));

            const submitButton = document.querySelector('.submit-quiz');
            const resetButton = document.querySelector('.reset-quiz');
            if (submitButton) submitButton.addEventListener('click', () => this.submitQuiz());
            if (resetButton) resetButton.addEventListener('click', () => this.resetQuiz());

            const hintButton = document.querySelector('.hint-button');
            if (hintButton) hintButton.addEventListener('click', () => this.showHint());

            if (this.config.enableKeyboardNavigation) {
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') this.navigateQuestion(-1);
                    if (e.key === 'ArrowRight') this.navigateQuestion(1);
                    if (e.key === 'h') this.showHint();
                });
            }
        },

        // Timer functionality
        setupTimer() {
            if (!this.config.enableTimer) return;

            const timerElement = document.querySelector('.quiz-timer');
            if (!timerElement) return;

            this.state.timer = setInterval(() => {
                const elapsed = Math.floor((new Date() - this.state.timeStarted) / 1000);
                const remaining = Math.max(0, this.config.timerDuration - elapsed);

                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;

                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                if (remaining === 0) {
                    this.submitQuiz();
                }
            }, 1000);
        },

        // Show hint for current question
        showHint() {
            if (this.state.hintsUsed >= this.config.maxHints) {
                this.showFeedback('No more hints available!', 'warning');
                return;
            }

            const question = this.state.questions[this.state.currentQuestion];
            if (!question.hint) {
                this.showFeedback('No hint available for this question.', 'info');
                return;
            }

            const hintElement = document.createElement('div');
            hintElement.className = 'hint-message';
            hintElement.textContent = question.hint;

            const questionElement = question.element;
            const existingHint = questionElement.querySelector('.hint-message');
            if (existingHint) existingHint.remove();

            questionElement.appendChild(hintElement);
            this.state.hintsUsed++;

            this.updateHintsRemaining();
        },

        // Update hints remaining display
        updateHintsRemaining() {
            const hintsRemaining = document.querySelector('.hints-remaining');
            if (hintsRemaining) {
                const remaining = this.config.maxHints - this.state.hintsUsed;
                hintsRemaining.textContent = `Hints remaining: ${remaining}`;
            }
        },

        // Show feedback message
        showFeedback(message, type = 'info') {
            const feedbackElement = document.createElement('div');
            feedbackElement.className = `feedback-message ${type}`;
            feedbackElement.textContent = message;

            const quizContainer = document.querySelector('.quiz-container');
            quizContainer.appendChild(feedbackElement);

            setTimeout(() => feedbackElement.remove(), 3000);
        },

        // Question Navigation
        navigateQuestion(direction) {
            const newIndex = this.state.currentQuestion + direction;
            if (newIndex >= 0 && newIndex < this.state.questions.length) {
                this.hideQuestion(this.state.currentQuestion, direction < 0);
                this.state.currentQuestion = newIndex;
                this.showQuestion(newIndex, direction < 0);
                this.updateProgress();
                this.scrollToQuestion();
            }
        },

        // Show/Hide Questions with Animations
        showQuestion(index, reverse = false) {
            const question = this.state.questions[index].element;
            question.style.display = 'block';
            question.classList.add('active');

            // Add animation classes
            question.classList.add(reverse ? this.config.animations.slideIn : this.config.animations.slideIn);
            question.classList.add(this.config.animations.fadeIn);

            setTimeout(() => {
                question.classList.remove(
                    this.config.animations.slideIn,
                    this.config.animations.slideOut,
                    this.config.animations.fadeIn,
                    this.config.animations.fadeOut
                );
            }, this.config.transitionDuration);

            document.querySelector('.current-question').textContent = index + 1;
        },

        hideQuestion(index, reverse = false) {
            const question = this.state.questions[index].element;
            question.classList.remove('active');
            question.classList.add(reverse ? this.config.animations.slideOut : this.config.animations.slideOut);
            question.classList.add(this.config.animations.fadeOut);

            setTimeout(() => {
                question.style.display = 'none';
                question.classList.remove(
                    this.config.animations.slideIn,
                    this.config.animations.slideOut,
                    this.config.animations.fadeIn,
                    this.config.animations.fadeOut
                );
            }, this.config.transitionDuration);
        },

        // Handle Option Selection
        handleOptionSelect(option) {
            if (this.state.isSubmitted) return;

            const question = this.state.questions[this.state.currentQuestion];
            const selectedOption = option.closest('.quiz-option');

            // Remove previous selections
            question.options.forEach(opt => {
                opt.element.classList.remove('selected', 'correct', 'wrong');
            });

            // Mark selected option
            selectedOption.classList.add('selected');

            // Show feedback
            this.showOptionFeedback(selectedOption);

            // Store answer
            this.state.answers[this.state.currentQuestion] = {
                selected: selectedOption,
                isCorrect: selectedOption.dataset.correct === 'true',
                timeSpent: new Date() - (this.state.timeStarted || new Date())
            };

            // Auto advance if enabled
            if (this.config.autoAdvance && this.config.immediateFeedback) {
                setTimeout(() => {
                    if (this.state.currentQuestion < this.state.questions.length - 1) {
                        this.navigateQuestion(1);
                    }
                }, this.config.feedbackDuration);
            }
        },

        // Show Option Feedback
        showOptionFeedback(selectedOption) {
            const question = this.state.questions[this.state.currentQuestion];
            const isCorrect = selectedOption.dataset.correct === 'true';

            // Show correct answer
            question.options.forEach(option => {
                if (option.element.dataset.correct === 'true') {
                    option.element.classList.add('correct');
                }
            });

            // Show wrong answer if selected
            if (!isCorrect) {
                selectedOption.classList.add('wrong');
            }

            // Add feedback message
            const feedbackElement = question.element.querySelector('.feedback-message');
            if (feedbackElement) {
                feedbackElement.textContent = isCorrect ?
                    'Correct! Well done!' :
                    'Incorrect. Try again!';
                feedbackElement.classList.add('visible');
                feedbackElement.classList.add(isCorrect ? 'correct' : 'incorrect');

                // Add explanation if available
                if (this.config.showExplanations) {
                    const explanation = selectedOption.dataset.explanation ||
                        question.element.dataset.explanation ||
                        'No explanation available.';
                    if (explanation) {
                        const explanationElement = document.createElement('div');
                        explanationElement.className = 'explanation';
                        explanationElement.textContent = explanation;
                        feedbackElement.appendChild(explanationElement);
                    }
                }
            }
        },

        // Update Progress
        updateProgress() {
            const progress = (this.state.answers.filter(a => a !== undefined).length / this.state.questions.length) * 100;
            const progressFill = document.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }

            // Update navigation buttons
            const prevButton = document.querySelector('.prev-question');
            const nextButton = document.querySelector('.next-question');
            if (prevButton) prevButton.disabled = this.state.currentQuestion === 0;
            if (nextButton) nextButton.disabled = this.state.currentQuestion === this.state.questions.length - 1;

            // Update submit button
            const submitButton = document.querySelector('.submit-quiz');
            if (submitButton) {
                submitButton.disabled = this.state.answers.length < this.state.questions.length;
            }
        },

        // Submit Quiz
        submitQuiz() {
            this.state.timeCompleted = new Date();
            clearInterval(this.state.timer);

            // Calculate score
            const totalQuestions = this.state.questions.length;
            const correctAnswers = this.state.answers.filter(a => a !== undefined && a.isCorrect).length;
            const score = Math.round((correctAnswers / totalQuestions) * 100);

            // Show results
            this.showResults(score);
        },

        // Show Results
        showResults(score) {
            const quizContainer = document.querySelector('.quiz-container');
            const resultsHTML = `
                <div class="quiz-results">
                    <div class="results-header">
                        <h3>Quiz Complete!</h3>
                        <div class="score-display ${this.getPerformanceClass(score)}">
                            <span class="score">${score}%</span>
                            <span class="performance">${this.getPerformanceTitle(score)}</span>
                        </div>
                    </div>
                    <div class="results-details">
                        <div class="detail-item">
                            <span class="label">Correct Answers:</span>
                            <span class="value">${this.state.answers.filter(a => a !== undefined && a.isCorrect).length}/${this.state.questions.length}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Time Taken:</span>
                            <span class="value">${this.formatTime(this.state.timeCompleted - this.state.timeStarted)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Hints Used:</span>
                            <span class="value">${this.state.hintsUsed}/${this.config.maxHints}</span>
                        </div>
                    </div>
                    <div class="results-actions">
                        <button class="review-quiz">Review Answers</button>
                        <button class="continue-course">Continue Course</button>
                    </div>
                </div>
            `;

            quizContainer.innerHTML = resultsHTML;
            this.setupResultsEventListeners();
        },

        // Format time
        formatTime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        },

        // Setup Results Event Listeners
        setupResultsEventListeners() {
            const reviewButton = document.querySelector('.review-quiz');
            const continueButton = document.querySelector('.continue-course');

            if (reviewButton) {
                reviewButton.addEventListener('click', () => this.enterReviewMode());
            }

            if (continueButton) {
                continueButton.addEventListener('click', () => this.continueCourse());
            }
        },

        // Enter Review Mode
        enterReviewMode() {
            this.state.reviewMode = true;
            this.state.currentQuestion = 0;
            this.showCurrentQuestion();
            this.updateProgress();
        },

        // Continue Course
        continueCourse() {
            // Save results to local storage
            this.saveQuizResults();

            // Redirect to next section or show completion message
            window.location.href = '#next-section';
        },

        // Save Quiz Results
        saveQuizResults() {
            const results = {
                score: this.state.score,
                timeTaken: this.state.timeCompleted - this.state.timeStarted,
                date: new Date().toISOString(),
                answers: this.state.answers
            };

            localStorage.setItem('quizResults', JSON.stringify(results));
        },

        // Reset Quiz
        resetQuiz() {
            this.state.currentQuestion = 0;
            this.state.score = 0;
            this.state.answers = [];
            this.state.isSubmitted = false;
            this.state.hintsUsed = 0;
            this.state.reviewMode = false;

            clearInterval(this.state.timer);
            this.state.timeStarted = new Date();
            this.setupTimer();

            this.updateProgress();
            this.showCurrentQuestion();
        },

        // Helper methods for results
        getScoreMessage(score) {
            if (score >= 90) return "Excellent work! You've mastered this topic!";
            if (score >= 70) return "Great job! You've passed the quiz!";
            if (score >= 50) return "Good effort! Keep practicing!";
            return "Keep working at it! You'll get there!";
        },

        getPerformanceClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            return 'needs-improvement';
        },

        getPerformanceTitle(score) {
            if (score >= 90) return 'Outstanding Performance!';
            if (score >= 70) return 'Solid Understanding';
            return 'Room for Improvement';
        },

        getPerformanceMessage(score) {
            if (score >= 90) return "You've demonstrated a thorough understanding of the material. Keep up the great work!";
            if (score >= 70) return "You've shown a good grasp of the concepts. A few more practice sessions will help reinforce your knowledge.";
            return "Don't worry! Review the material and try again. You'll improve with practice.";
        },

        generateDetailedFeedback() {
            return this.state.questions.map((question, index) => {
                        const answer = this.state.answers[index];
                        const isCorrect = answer && answer.isCorrect;
                        const selectedOption = answer ? answer.selected : null;

                        return `
                    <div class="feedback-item ${isCorrect ? 'correct' : 'incorrect'}">
                        <div class="question">${index + 1}. ${question.text}</div>
                        <div class="answer">Your answer: ${selectedOption ? selectedOption.querySelector('.option-text').textContent : 'Not answered'}</div>
                        ${!isCorrect ? `<div class="correct-answer">Correct answer: ${question.options.find(opt => opt.isCorrect).text}</div>` : ''}
                        ${question.explanation ? `<div class="explanation">${question.explanation}</div>` : ''}
                    </div>
                `;
            }).join('');
        },

        // Scroll to current question
        scrollToQuestion() {
            const question = this.state.questions[this.state.currentQuestion].element;
            question.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        // Utility Functions
        showCurrentQuestion() {
            this.state.questions.forEach((question, index) => {
                if (index === this.state.currentQuestion) {
                    this.showQuestion(index);
                } else {
                    question.element.style.display = 'none';
                    question.element.classList.remove('active');
                }
            });
        }
};

// Initialize Quiz System when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    QuizSystem.init();
});