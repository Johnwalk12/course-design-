// Voice Recording System
const VoiceRecordingSystem = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    speechRecognition: null,
    currentTranscription: '',
    completeTranscription: '',
    currentResponseArea: null,
    audioPlayer: null,
    isSpeechRecognitionSupported: false,

    init() {
        try {
            // Check browser compatibility
            this.isSpeechRecognitionSupported = 'webkitSpeechRecognition' in window;

            // Initialize speech recognition if available
            if (this.isSpeechRecognitionSupported) {
                this.initializeSpeechRecognition();
            } else {
                this.showBrowserCompatibilityMessage();
            }

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing voice recording system:', error);
            this.showError('Failed to initialize voice recording system');
        }
    },

    initializeSpeechRecognition() {
        try {
            this.speechRecognition = new webkitSpeechRecognition();
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'en-US';

            this.setupSpeechRecognitionHandlers();
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            this.showError('Failed to initialize speech recognition');
        }
    },

    setupSpeechRecognitionHandlers() {
        if (!this.speechRecognition) return;

        this.speechRecognition.onresult = (event) => {
            try {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                        this.completeTranscription += (this.completeTranscription ? ' ' : '') + finalTranscript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                this.updateTranscriptionDisplay(interimTranscript);
            } catch (error) {
                console.error('Error handling speech recognition result:', error);
            }
        };

        this.speechRecognition.onstart = () => {
            this.completeTranscription = '';
            this.showRecordingStatus('Recording started...');
        };

        this.speechRecognition.onend = () => {
            this.showRecordingStatus('Recording stopped');
        };

        this.speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleSpeechRecognitionError(event);
        };
    },

    updateTranscriptionDisplay(interimTranscript) {
        if (!this.currentResponseArea) return;

        const transcriptionText = this.currentResponseArea.querySelector('.transcription-text');
        if (!transcriptionText) return;

        const displayText = this.completeTranscription + (interimTranscript ? ' ' + interimTranscript : '');
        transcriptionText.textContent = displayText;

        // Update word count
        const wordCount = this.currentResponseArea.querySelector('.word-count');
        if (wordCount) {
            const count = this.completeTranscription.split(/\s+/).filter(word => word.length > 0).length;
            wordCount.textContent = `${count} words`;
        }
    },

    setupEventListeners() {
        document.querySelectorAll('.record-response').forEach(button => {
            button.addEventListener('click', () => this.toggleRecording(button));
        });

        document.querySelectorAll('.save-response').forEach(button => {
            button.addEventListener('click', () => this.saveRecording(button));
        });
    },

    handleSpeechRecognitionError(event) {
        if (event.error === 'no-speech') {
            this.completeTranscription = '';
            this.updateTranscriptionDisplay('');
            this.showRecordingStatus('No speech detected');
        } else {
            this.showRecordingStatus('Speech recognition error occurred');
        }
    },

    async toggleRecording(button) {
        try {
            if (!button) return;

            const responseArea = button.closest('.response-area');
            if (!responseArea) return;

            this.currentResponseArea = responseArea;

            if (!this.isRecording) {
                await this.startRecording(button);
            } else {
                await this.stopRecording(button);
            }
        } catch (error) {
            console.error('Error toggling recording:', error);
            this.showRecordingStatus('Error toggling recording');
        }
    },

    async startRecording(button) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.completeTranscription = '';

            this.setupMediaRecorderHandlers(button);

            this.mediaRecorder.start();
            this.isRecording = true;

            this.updateButtonState(button, true);
            this.clearTranscriptionText();

            if (this.speechRecognition) {
                this.speechRecognition.start();
            }
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showRecordingStatus('Unable to access microphone. Please check permissions.');
        }
    },

    async stopRecording(button) {
        if (!this.mediaRecorder) return;

        try {
            this.mediaRecorder.stop();
            this.isRecording = false;

            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }

            this.updateButtonState(button, false);
        } catch (error) {
            console.error('Error stopping recording:', error);
            this.showRecordingStatus('Error stopping recording');
        }
    },

    setupMediaRecorderHandlers(button) {
        if (!this.mediaRecorder || !this.currentResponseArea) return;

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            try {
                this.handleRecordingComplete(button);
            } catch (error) {
                console.error('Error handling recording completion:', error);
                this.showRecordingStatus('Error saving recording');
            }
        };
    },

    handleRecordingComplete(button) {
        if (!this.currentResponseArea) return;

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        this.currentResponseArea.dataset.audioUrl = audioUrl;
        this.createAudioPlayer(audioUrl, this.currentResponseArea);

        this.updateButtonState(button, false);

        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }

        this.updateTextArea();
    },

    updateButtonState(button, isRecording) {
        if (!button) return;

        button.classList.toggle('recording', isRecording);
        const icon = button.querySelector('i');
        if (icon) {
            icon.className = isRecording ? 'fas fa-stop' : 'fas fa-microphone';
        }
    },

    clearTranscriptionText() {
        if (!this.currentResponseArea) return;

        const transcriptionText = this.currentResponseArea.querySelector('.transcription-text');
        if (transcriptionText) {
            transcriptionText.textContent = '';
        }
    },

    updateTextArea() {
        if (!this.currentResponseArea) return;

        const textarea = this.currentResponseArea.querySelector('textarea');
        if (textarea && this.completeTranscription) {
            const currentText = textarea.value;
            textarea.value = currentText ? `${currentText}\n${this.completeTranscription}` : this.completeTranscription;
        }
    },

    createAudioPlayer(audioUrl, responseArea) {
        if (!responseArea || !audioUrl) return;

        const existingPlayer = responseArea.querySelector('.audio-player');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        const audioPlayerContainer = document.createElement('div');
        audioPlayerContainer.className = 'audio-player';
        audioPlayerContainer.innerHTML = `
            <audio controls>
                <source src="${audioUrl}" type="audio/wav">
                Your browser does not support the audio element.
            </audio>
            <button class="download-audio touch-feedback">
                <i class="fas fa-download"></i> Download Recording
            </button>
        `;

        const downloadButton = audioPlayerContainer.querySelector('.download-audio');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => this.downloadRecording(audioUrl));
        }

        const transcriptionContainer = responseArea.querySelector('.transcription-container');
        if (transcriptionContainer) {
            transcriptionContainer.after(audioPlayerContainer);
        }

        return audioPlayerContainer;
    },

    downloadRecording(audioUrl) {
        if (!audioUrl) return;

        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `recording-${new Date().toISOString()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    saveRecording(button) {
        if (!button) return;

        const responseArea = button.closest('.response-area');
        if (!responseArea) return;

        const audioUrl = responseArea.dataset.audioUrl;
        if (audioUrl) {
            this.downloadRecording(audioUrl);
            button.classList.add('saved');
            setTimeout(() => button.classList.remove('saved'), 2000);
        }
    },

    showError(message) {
        console.error(message);
        this.showRecordingStatus(message);
    },

    showRecordingStatus(message) {
        if (!this.currentResponseArea) return;

        const statusElement = this.currentResponseArea.querySelector('.recording-status') ||
            document.createElement('div');
        statusElement.className = 'recording-status';
        statusElement.textContent = message;

        if (!this.currentResponseArea.querySelector('.recording-status')) {
            this.currentResponseArea.appendChild(statusElement);
        }

        setTimeout(() => {
            statusElement.style.opacity = '0';
            setTimeout(() => statusElement.remove(), 500);
        }, 3000);
    },

    showBrowserCompatibilityMessage() {
        const message = "This browser does not support live script. Please use Chrome for best performance.";
        const responseAreas = document.querySelectorAll('.response-area');

        responseAreas.forEach(area => {
            const transcriptionContainer = area.querySelector('.transcription-container');
            if (transcriptionContainer) {
                const messageElement = document.createElement('div');
                messageElement.className = 'browser-compatibility-message';
                messageElement.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <span>${message}</span>
                `;
                transcriptionContainer.appendChild(messageElement);
            }
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    VoiceRecordingSystem.init();
});