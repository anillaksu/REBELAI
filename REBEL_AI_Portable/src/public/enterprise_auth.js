// ==========================================
// 🛡️ REBEL AI Enterprise Authentication
// ==========================================
// Modern Enterprise Login/Signup System

class EnterpriseAuth {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.currentForm = 'loginForm';
        this.mfaSetupData = null;
        this.selectedRole = null;
        
        // DOM Elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notifications = document.getElementById('notifications');
        
        // Forms
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        this.mfaSetupForm = document.getElementById('mfaSetupForm');
        
        // Initialize
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.checkBootstrapStatus();
            this.showNotification('🛡️ Enterprise Authentication Ready', 'info');
        } catch (error) {
            console.error('Enterprise Auth initialization error:', error);
            this.showNotification('Failed to initialize authentication system', 'error');
        }
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Form switching
        document.querySelectorAll('.switch-form').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetForm = link.dataset.target;
                this.switchForm(targetForm);
            });
        });

        // Password toggles
        document.getElementById('loginPasswordToggle').addEventListener('click', () => {
            this.togglePasswordVisibility('loginPassword', 'loginPasswordToggle');
        });

        document.getElementById('signupPasswordToggle').addEventListener('click', () => {
            this.togglePasswordVisibility('signupPassword', 'signupPasswordToggle');
        });

        // Real-time validation
        document.getElementById('signupUsername').addEventListener('input', (e) => {
            this.validateUsername(e.target.value);
        });

        document.getElementById('signupEmail').addEventListener('input', (e) => {
            this.validateEmail(e.target.value);
        });

        document.getElementById('signupPassword').addEventListener('input', (e) => {
            this.validatePasswordStrength(e.target.value);
        });

        document.getElementById('confirmPassword').addEventListener('input', (e) => {
            this.validatePasswordMatch();
        });

        // Role selection
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectRole(option.dataset.role);
            });
        });

        // MFA Setup Steps
        document.getElementById('mfaNext1')?.addEventListener('click', () => {
            this.showMfaStep(2);
        });

        document.getElementById('mfaNext2')?.addEventListener('click', () => {
            this.showMfaStep(3);
        });

        document.getElementById('completeMfaSetup')?.addEventListener('click', () => {
            this.completeMfaSetup();
        });

        document.getElementById('mfaVerificationCode')?.addEventListener('input', (e) => {
            if (e.target.value.length === 6) {
                this.verifyMfaSetup();
            }
        });

        // Utility buttons
        document.getElementById('copySecret')?.addEventListener('click', () => {
            this.copyToClipboard();
        });

        document.getElementById('downloadBackupCodes')?.addEventListener('click', () => {
            this.downloadBackupCodes();
        });

        document.getElementById('printBackupCodes')?.addEventListener('click', () => {
            this.printBackupCodes();
        });
    }

    async checkBootstrapStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bootstrap/check`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.needsBootstrap) {
                // Show role selection for first user
                document.getElementById('roleSelection').style.display = 'block';
                this.showNotification('🚀 Welcome! Set up your enterprise account', 'info');
            }
        } catch (error) {
            console.warn('Bootstrap check failed:', error);
        }
    }

    async handleLogin() {
        const form = document.getElementById('loginFormElement');
        const formData = new FormData(form);
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password'),
            mfaToken: formData.get('mfaToken') || null
        };

        try {
            this.setButtonLoading('loginBtn', true);
            
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (response.ok) {
                if (data.requiresMfa && !loginData.mfaToken) {
                    // Show MFA input
                    document.getElementById('mfaTokenGroup').style.display = 'block';
                    document.getElementById('mfaToken').focus();
                    this.showNotification('🔐 Enter your 2FA code', 'info');
                } else {
                    // Successful login - immediate redirect
                    this.showNotification('✅ Login successful! Redirecting...', 'success');
                    // Store auth data
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('userRole', data.user.role);
                    // Immediate redirect to dashboard
                    window.location.href = '/dashboard';
                }
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
                
                // Reset MFA input on failure
                if (data.error.includes('MFA')) {
                    document.getElementById('mfaToken').value = '';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.setButtonLoading('loginBtn', false);
        }
    }

    async handleSignup() {
        const form = document.getElementById('signupFormElement');
        const formData = new FormData(form);
        
        // Validate form
        if (!this.validateSignupForm()) {
            return;
        }

        const signupData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            selectedRole: this.selectedRole || 'OPERATOR' // Default to OPERATOR if no role selected
        };

        try {
            this.setButtonLoading('signupBtn', true);
            
            const response = await fetch(`${this.apiBaseUrl}/bootstrap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signupData)
            });

            const data = await response.json();

            if (response.ok) {
                // Store MFA setup data
                this.mfaSetupData = data;
                
                // Switch to MFA setup
                this.switchForm('mfaSetupForm');
                this.setupMfaQrCode(data.qrCode, data.secret);
                
                this.showNotification('🎉 Account created! Set up 2FA to continue', 'success');
            } else {
                this.showNotification(data.error || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.setButtonLoading('signupBtn', false);
        }
    }

    setupMfaQrCode(qrCodeDataUrl, secret) {
        // Display QR Code
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = `<img src="${qrCodeDataUrl}" alt="QR Code" style="width: 100%; height: 100%; border-radius: 8px;">`;
        
        // Display secret key
        document.getElementById('secretKey').textContent = secret;
    }

    async verifyMfaSetup() {
        const token = document.getElementById('mfaVerificationCode').value;
        
        if (token.length !== 6) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/verify-mfa-setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.mfaSetupData.userId,
                    token: token
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Show backup codes
                this.displayBackupCodes(data.backupCodes);
                document.getElementById('backupCodes').style.display = 'block';
                this.showNotification('✅ 2FA verified successfully!', 'success');
            } else {
                this.showNotification(data.error || 'Invalid verification code', 'error');
                document.getElementById('mfaVerificationCode').value = '';
            }
        } catch (error) {
            console.error('MFA verification error:', error);
            this.showNotification('Verification failed. Please try again.', 'error');
        }
    }

    displayBackupCodes(codes) {
        const container = document.getElementById('backupCodesList');
        container.innerHTML = '';
        
        codes.forEach(code => {
            const codeElement = document.createElement('div');
            codeElement.className = 'backup-code';
            codeElement.textContent = code;
            container.appendChild(codeElement);
        });
    }

    async completeMfaSetup() {
        try {
            this.showNotification('🎉 Setup complete! Redirecting to dashboard...', 'success');
            
            // Auto-login after successful MFA setup
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } catch (error) {
            console.error('MFA setup completion error:', error);
            this.showNotification('Setup completion failed', 'error');
        }
    }

    // Form Management
    switchForm(targetFormId) {
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Show target form
        setTimeout(() => {
            document.getElementById(targetFormId).classList.add('active');
            this.currentForm = targetFormId;
        }, 150);
    }

    showMfaStep(stepNumber) {
        document.querySelectorAll('.mfa-step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.getElementById(`mfaStep${stepNumber}`).classList.add('active');
    }

    // Validation Functions
    validateSignupForm() {
        let isValid = true;
        
        // Check password match
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showValidation('confirmPasswordValidation', 'Passwords do not match', 'invalid');
            isValid = false;
        }
        
        // Check password strength
        if (!this.isPasswordStrong(password)) {
            this.showNotification('Please choose a stronger password', 'warning');
            isValid = false;
        }
        
        return isValid;
    }

    validateUsername(username) {
        const validation = document.getElementById('usernameValidation');
        
        if (username.length < 3) {
            this.showValidation('usernameValidation', 'Username must be at least 3 characters', 'invalid');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            this.showValidation('usernameValidation', 'Username can only contain letters, numbers, _ and -', 'invalid');
            return false;
        }
        
        this.showValidation('usernameValidation', '✓ Username looks good', 'valid');
        return true;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            this.showValidation('emailValidation', 'Please enter a valid email address', 'invalid');
            return false;
        }
        
        this.showValidation('emailValidation', '✓ Email format is valid', 'valid');
        return true;
    }

    validatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text span');
        
        let strength = 0;
        let strengthLabel = 'Very Weak';
        let strengthClass = 'weak';
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Character variety
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        // Determine strength level
        if (strength >= 6) {
            strengthLabel = 'Very Strong';
            strengthClass = 'strong';
        } else if (strength >= 4) {
            strengthLabel = 'Strong';
            strengthClass = 'strong';
        } else if (strength >= 3) {
            strengthLabel = 'Good';
            strengthClass = 'good';
        } else if (strength >= 2) {
            strengthLabel = 'Fair';
            strengthClass = 'fair';
        }
        
        // Update UI
        strengthBar.className = `strength-fill ${strengthClass}`;
        strengthText.textContent = strengthLabel;
        
        return strength >= 4;
    }

    validatePasswordMatch() {
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.showValidation('confirmPasswordValidation', 'Passwords do not match', 'invalid');
            return false;
        }
        
        if (confirmPassword && password === confirmPassword) {
            this.showValidation('confirmPasswordValidation', '✓ Passwords match', 'valid');
            return true;
        }
        
        return true;
    }

    isPasswordStrong(password) {
        return password.length >= 8 && 
               /[a-z]/.test(password) && 
               /[A-Z]/.test(password) && 
               /[0-9]/.test(password);
    }

    showValidation(elementId, message, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `input-validation ${type}`;
        }
    }

    // Role Selection
    selectRole(role) {
        // Remove previous selection
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Select new role
        document.querySelector(`[data-role="${role}"]`).classList.add('selected');
        this.selectedRole = this.getRoleId(role);
        
        this.showNotification(`Selected role: ${role}`, 'info');
    }

    getRoleId(roleName) {
        const roleMap = {
            'ROOT': 1,
            'OWNER': 2, 
            'ADMIN': 3,
            'OPERATOR': 4,
            'VIEWER': 5
        };
        return roleMap[roleName] || 4;
    }

    // Utility Functions
    togglePasswordVisibility(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.textContent = '🙈';
        } else {
            input.type = 'password';
            toggle.textContent = '👁️';
        }
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        const btnText = button.querySelector('.btn-text');
        const btnIcon = button.querySelector('.btn-icon');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
            btnLoading.style.display = 'block';
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            btnLoading.style.display = 'none';
        }
    }

    showLoading(show = true) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    copyToClipboard() {
        const secretKey = document.getElementById('secretKey').textContent;
        navigator.clipboard.writeText(secretKey).then(() => {
            this.showNotification('Secret key copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy secret key', 'error');
        });
    }

    downloadBackupCodes() {
        const codes = Array.from(document.querySelectorAll('.backup-code')).map(el => el.textContent);
        const content = `REBEL AI Enterprise - Backup Recovery Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Save these codes securely. Each can only be used once.\n\n${codes.join('\n')}\n\nKeep these codes safe and secure!`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rebel-ai-backup-codes-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Backup codes downloaded!', 'success');
    }

    printBackupCodes() {
        const codes = Array.from(document.querySelectorAll('.backup-code')).map(el => el.textContent);
        const printContent = `
            <html>
                <head>
                    <title>REBEL AI Enterprise - Backup Codes</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 40px; }
                        .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                        .code { padding: 10px; border: 1px solid #ccc; font-family: monospace; }
                        .warning { margin-top: 40px; padding: 20px; background: #f0f0f0; border-left: 4px solid #ff6600; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🛡️ REBEL AI Enterprise</h1>
                        <h2>Backup Recovery Codes</h2>
                        <p>Generated: ${new Date().toLocaleString()}</p>
                    </div>
                    <div class="codes">
                        ${codes.map(code => `<div class="code">${code}</div>`).join('')}
                    </div>
                    <div class="warning">
                        <h3>⚠️ IMPORTANT SECURITY NOTICE</h3>
                        <ul>
                            <li>Keep these codes safe and secure</li>
                            <li>Each code can only be used once</li>
                            <li>Use them if you lose access to your authenticator app</li>
                            <li>Do not share these codes with anyone</li>
                        </ul>
                    </div>
                </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        
        this.showNotification('Backup codes ready for printing!', 'success');
    }

    // Notification System
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        this.notifications.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

// Initialize Enterprise Authentication
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ REBEL AI Enterprise Authentication Loading...');
    new EnterpriseAuth();
});

// Add notification close button styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
.notification-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: var(--transition-fast);
}

.notification-close:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}
`;
document.head.appendChild(notificationStyles);