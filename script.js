// Message templates
const messageTemplates = {
    safety: {
        text: "Safety Alert: Please wear protective equipment in this area.",
        icon: "⚠️",
        responses: ["Understood", "Need Equipment", "Report Issue"],
        type: "warning"
    },
    break: {
        text: "Break time! Please finish current task and take a 15-minute break.",
        icon: "☕",
        responses: ["Starting Break", "5 More Minutes", "Almost Done"],
        type: "info"
    },
    meeting: {
        text: "Team meeting in Conference Room A at 2:00 PM. Please attend.",
        icon: "📅",
        responses: ["Will Attend", "Running Late", "Cannot Attend"],
        type: "info"
    },
    task: {
        text: "New task assigned: Check equipment in Zone 3. Priority: Medium.",
        icon: "📋",
        responses: ["Accepted", "Need Details", "Busy - Reassign"],
        type: "info"
    },
    emergency: {
        text: "EMERGENCY: Evacuate area immediately. Report to muster point.",
        icon: "🚨",
        responses: ["Evacuating", "Need Help", "Area Clear"],
        type: "emergency"
    },
    office: {
        text: "Please come to the office when you have completed your current task.",
        icon: "🏢",
        responses: ["On my way", "Need 10 mins", "Cannot come"],
        type: "info"
    },
    mood: {
        text: "Quick mood check: How are you feeling today?",
        icon: "😊",
        responses: ["😊", "😐", "😞"],
        type: "info"
    }
};

// Global variables
let messageHistory = [];
let currentMessages = {}; // Track current messages per device
let scheduledTimeouts = {}; // Track scheduled message timeout IDs
let deviceStates = {
    1: { online: true, busy: false },
    2: { online: true, busy: false },
    3: { online: true, busy: false },
    4: { online: true, busy: false }
};

// Calculate dynamic font size based on button text length
function calculateButtonFontSize(text) {
    const length = text.length;
    if (length <= 4) return '14px';        // Very short text - large font
    if (length <= 8) return '12px';        // Short text - medium font
    if (length <= 12) return '11px';       // Medium text - default font
    if (length <= 16) return '10px';       // Long text - small font
    return '9px';                          // Very long text - very small font
}

// Calculate dynamic font size based on message length
function calculateFontSize(text) {
    const length = text.length;
    if (length <= 20) return '18px';       // Very short messages - large font
    if (length <= 40) return '16px';       // Short messages - medium-large font
    if (length <= 80) return '14px';       // Medium messages - medium font
    if (length <= 120) return '13px';      // Long messages - small-medium font
    return '12px';                         // Very long messages - small font
}

// Calculate font size to prevent button overlap
function calculateFontSizeForDevice(text, deviceId, hasButtons = false) {
    const length = text.length;
    
    // Base font size calculation - more conservative sizing
    let fontSize = 16;
    if (length <= 20) fontSize = 16;       // Very short messages - large font
    else if (length <= 40) fontSize = 15;  // Short messages - medium-large font
    else if (length <= 60) fontSize = 14;  // Medium messages - medium font
    else if (length <= 100) fontSize = 13; // Long messages - small-medium font
    else fontSize = 12;                     // Very long messages - small font
    
    // If there are response buttons, reduce font size slightly but keep it readable
    if (hasButtons) {
        // Only reduce by 1px for buttons, keeping minimum readability
        fontSize = Math.max(fontSize - 1, 11); // Minimum 11px for readability
    }
    
    return `${fontSize}px`;
}

// Check for overlap and adjust font size if necessary
function adjustFontSizeForOverlap(deviceId) {
    const deviceMessage = document.getElementById(`device${deviceId}Message`);
    const deviceButtons = document.getElementById(`device${deviceId}Buttons`);
    const messageText = deviceMessage.querySelector('.message-text');
    
    if (!messageText || !deviceButtons || deviceButtons.children.length === 0) {
        return; // No message text or no buttons to check overlap
    }
    
    const messageRect = deviceMessage.getBoundingClientRect();
    const buttonsRect = deviceButtons.getBoundingClientRect();
    
    // Check if message content overlaps with buttons
    const messageBottom = messageRect.bottom;
    const buttonsTop = buttonsRect.top;
    
    // If there's overlap (with a 5px buffer instead of 10px)
    if (messageBottom > buttonsTop - 5) {
        const currentFontSize = parseInt(window.getComputedStyle(messageText).fontSize);
        let newFontSize = currentFontSize - 1;
        
        // Keep reducing font size until no overlap or minimum size reached
        // Increased minimum font size to 10px for better readability
        while (newFontSize >= 10 && messageBottom > buttonsTop - 5) {
            messageText.style.fontSize = `${newFontSize}px`;
            
            // Recalculate after font size change
            const updatedMessageRect = deviceMessage.getBoundingClientRect();
            const updatedMessageBottom = updatedMessageRect.bottom;
            
            if (updatedMessageBottom <= buttonsTop - 5) {
                break; // No more overlap
            }
            
            newFontSize--;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateCharCount();
    setDefaultResponses();
    updateSelectedCount();
    setupDeviceSelectionListeners();
    updateConnectionStatus();
});

// Setup device selection listeners
function setupDeviceSelectionListeners() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="device"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedCount);
    });
}

// Update selected device count
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="device"]:checked');
    const count = checkboxes.length;
    document.getElementById('selectedCount').textContent = count;
    
    // Update send button state
    const sendBtn = document.querySelector('.send-btn');
    if (count === 0) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Select Device(s) First';
    } else {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Message';
    }
}

// Select all devices
function selectAllDevices() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="device"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedCount();
}

// Clear all device selections
function clearAllDevices() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="device"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedCount();
}

// Update connection status display
function updateConnectionStatus() {
    const connections = document.querySelectorAll('.device-connection');
    connections.forEach((connection, index) => {
        const deviceId = index + 1;
        if (deviceStates[deviceId].online) {
            connection.classList.remove('offline');
        } else {
            connection.classList.add('offline');
        }
    });
}

// Load template into message input
function loadTemplate() {
    const template = document.getElementById('template').value;
    const messageTextarea = document.getElementById('message');
    
    if (template && messageTemplates[template]) {
        messageTextarea.value = messageTemplates[template].text;
        
        // Load default response buttons
        const responses = messageTemplates[template].responses;
        document.getElementById('response1').value = responses[0] || '';
        document.getElementById('response2').value = responses[1] || '';
        document.getElementById('response3').value = responses[2] || '';
        
        // Enable response buttons based on template
        document.getElementById('enable1').checked = true;
        document.getElementById('enable2').checked = responses[1] ? true : false;
        document.getElementById('enable3').checked = responses[2] ? true : false;
    }
    
    updateCharCount();
}

// Update character count
function updateCharCount() {
    const messageTextarea = document.getElementById('message');
    const charCountElement = document.getElementById('charCount');
    const currentLength = messageTextarea.value.length;
    
    charCountElement.textContent = currentLength;
    
    // Add warning class if approaching limit
    if (currentLength > 120) {
        charCountElement.parentElement.classList.add('warning');
    } else {
        charCountElement.parentElement.classList.remove('warning');
    }
}

// Set default response buttons
function setDefaultResponses() {
    document.getElementById('response1').value = 'OK';
    document.getElementById('response2').value = 'Received';
    document.getElementById('response3').value = '';
}

// Send message to selected worker devices
function sendMessage() {
    const messageText = document.getElementById('message').value.trim();
    
    if (!messageText) {
        alert('Please enter a message');
        return;
    }
    
    if (messageText.length > 140) {
        alert('Message exceeds 140 character limit');
        return;
    }
    
    // Check if scheduling is enabled
    const scheduleEnabled = document.getElementById('scheduleEnabled').checked;
    let scheduledDate = null;
    let recurring = null;
    
    if (scheduleEnabled) {
        const dateValue = document.getElementById('scheduleDate').value;
        const timeValue = document.getElementById('scheduleTime').value;
        recurring = document.getElementById('recurring').value || null;
        
        if (!dateValue || !timeValue) {
            alert('Please select both date and time for scheduled message');
            return;
        }
        
        scheduledDate = new Date(`${dateValue}T${timeValue}`);
        const now = new Date();
        
        if (scheduledDate <= now) {
            alert('Scheduled time must be in the future');
            return;
        }
    }
    
    // Get selected devices
    const selectedDevices = [];
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="device"]:checked');
    checkboxes.forEach(checkbox => {
        selectedDevices.push(parseInt(checkbox.value));
    });
    
    if (selectedDevices.length === 0) {
        alert('Please select at least one device');
        return;
    }
    
    // Collect enabled response buttons
    const responses = [];
    if (document.getElementById('enable1').checked && document.getElementById('response1').value.trim()) {
        responses.push(document.getElementById('response1').value.trim());
    }
    if (document.getElementById('enable2').checked && document.getElementById('response2').value.trim()) {
        responses.push(document.getElementById('response2').value.trim());
    }
    if (document.getElementById('enable3').checked && document.getElementById('response3').value.trim()) {
        responses.push(document.getElementById('response3').value.trim());
    }
    
    if (responses.length === 0) {
        alert('Please enable at least one response button');
        return;
    }
    
    // Create message object
    const template = document.getElementById('template').value;
    let messageType = 'info';
    let messageIcon = null;
    
    // Get template info if one is selected
    if (template && messageTemplates[template]) {
        messageType = messageTemplates[template].type;
        messageIcon = messageTemplates[template].icon;
    }
    
    const message = {
        id: Date.now(),
        text: messageText,
        responses: responses,
        timestamp: new Date(),
        status: scheduleEnabled ? 'scheduled' : 'sent',
        devices: selectedDevices,
        deviceResponses: {},
        type: messageType,
        icon: messageIcon,
        template: template,
        scheduledDate: scheduledDate,
        recurring: recurring
    };
    
    if (scheduleEnabled) {
        // Schedule the message
        scheduleMessage(message);
        alert(`Message scheduled for ${scheduledDate.toLocaleString()}${recurring ? ` (${recurring})` : ''}`);
    } else {
        // Send immediately
        sendMessageToDevices(message);
    }
    
    // Add to history
    messageHistory.unshift(message);
    updateMessageHistory();
    
    // Clear form
    clearMessageForm();
    
    // Disable send button temporarily
    const sendBtn = document.querySelector('.send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = `Message Sent to ${selectedDevices.length} Device(s)`;
    
    setTimeout(() => {
        updateSelectedCount(); // This will re-enable the button and set correct text
    }, 2000);
}

// Send message to devices (extracted from sendMessage for reuse)
function sendMessageToDevices(message) {
    message.devices.forEach(deviceId => {
        displayMessageOnDevice(message, deviceId);
        updateDeviceStatus(`Received`, deviceId, 'received');
    });
    
    // Update status and UI feedback
    const sendBtn = document.querySelector('.send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = `Message Sent to ${message.devices.length} Device(s)`;
    
    setTimeout(() => {
        updateSelectedCount(); // This will re-enable the button and set correct text
    }, 2000);
}

// Schedule a message
function scheduleMessage(message) {
    const delay = message.scheduledDate.getTime() - Date.now();
    
    const timeoutId = setTimeout(() => {
        // Remove from scheduled timeouts
        delete scheduledTimeouts[message.id];
        
        // Update message status and send
        message.status = 'sent';
        message.timestamp = new Date();
        sendMessageToDevices(message);
        updateMessageHistory();
        
        // Handle recurring messages
        if (message.recurring) {
            scheduleRecurringMessage(message);
        }
    }, delay);
    
    // Store timeout ID for potential cancellation
    scheduledTimeouts[message.id] = timeoutId;
}

// Schedule recurring message
function scheduleRecurringMessage(originalMessage) {
    const nextMessage = { ...originalMessage };
    nextMessage.id = Date.now();
    
    // Calculate next occurrence
    const nextDate = new Date(originalMessage.scheduledDate);
    switch (originalMessage.recurring) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
    }
    
    nextMessage.scheduledDate = nextDate;
    nextMessage.status = 'scheduled';
    
    // Add to history and schedule
    messageHistory.unshift(nextMessage);
    updateMessageHistory();
    scheduleMessage(nextMessage);
}

// Delete a scheduled message
function deleteScheduledMessage(messageId) {
    // Find the message in history
    const messageIndex = messageHistory.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    const message = messageHistory[messageIndex];
    
    // Only allow deletion of scheduled messages
    if (message.status !== 'scheduled') {
        alert('Only scheduled messages can be deleted');
        return;
    }
    
    // Confirm deletion
    const scheduleTime = message.scheduledDate.toLocaleString();
    const confirmText = `Delete scheduled message?\n\n"${message.text}"\n\nScheduled for: ${scheduleTime}${message.recurring ? ` (${message.recurring})` : ''}`;
    
    if (!confirm(confirmText)) {
        return;
    }
    
    // Cancel the timeout if it exists
    if (scheduledTimeouts[messageId]) {
        clearTimeout(scheduledTimeouts[messageId]);
        delete scheduledTimeouts[messageId];
    }
    
    // Remove from message history
    messageHistory.splice(messageIndex, 1);
    updateMessageHistory();
    
    alert('Scheduled message deleted successfully');
}

// Display message on specific worker device
function displayMessageOnDevice(message, deviceId) {
    const deviceMessage = document.getElementById(`device${deviceId}Message`);
    const deviceButtons = document.getElementById(`device${deviceId}Buttons`);
    const deviceScreen = deviceMessage.closest('.device-screen');
    
    // Store current message ID for this device
    currentMessages[deviceId] = message.id;
    
    // Determine message type based on template type or content
    let messageType = 'info';
    if (message.template === 'safety' || message.template === 'emergency') {
        messageType = message.template === 'safety' ? 'warning' : 'emergency';
    }
    
    // Apply emergency/warning styling to entire screen
    deviceScreen.className = 'device-screen';
    if (messageType === 'emergency' || messageType === 'warning') {
        deviceScreen.classList.add(messageType);
    }
    
    // Create message content with icon at top center
    let messageContent = '';
    const hasButtons = message.responses && message.responses.length > 0;
    const fontSize = calculateFontSizeForDevice(message.text, deviceId, hasButtons);
    
    if (message.icon) {
        messageContent = `
            <div class="message-icon">${message.icon}</div>
            <div class="message-text" style="font-size: ${fontSize};">${message.text}</div>
        `;
    } else {
        messageContent = `<div class="message-text" style="font-size: ${fontSize};">${message.text}</div>`;
    }
    
    // Display message
    deviceMessage.innerHTML = `
        <div class="message-content ${messageType}">
            ${messageContent}
        </div>
    `;
    
    // Create response buttons with alternating styles
    deviceButtons.innerHTML = '';
    message.responses.forEach((response, index) => {
        const button = document.createElement('button');
        button.className = index === 0 ? 'device-btn' : 'device-btn outlined';
        button.textContent = response;
        button.style.fontSize = calculateButtonFontSize(response);
        button.onclick = () => respondToMessage(response, deviceId);
        deviceButtons.appendChild(button);
    });
    
    // Add device animation
    deviceMessage.classList.add('pulse');
    setTimeout(() => deviceMessage.classList.remove('pulse'), 500);
    
    // Check for overlap after rendering and adjust if necessary
    setTimeout(() => adjustFontSizeForOverlap(deviceId), 100);
}

// Handle response from specific worker device
function respondToMessage(responseText, deviceId) {
    const messageId = currentMessages[deviceId];
    if (!messageId) return;
    
    // Update device status
    updateDeviceStatus('Sending...', deviceId, 'sending');
    
    // Add visual feedback - make clicked button green
    const clickedButton = event.target;
    const originalClass = clickedButton.className;
    clickedButton.style.background = '#28a745';
    clickedButton.style.borderColor = '#28a745';
    clickedButton.style.color = 'white';
    clickedButton.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        // Find message in history and update it
        const messageIndex = messageHistory.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
            messageHistory[messageIndex].deviceResponses[deviceId] = {
                response: responseText,
                responseTime: new Date()
            };
            messageHistory[messageIndex].status = 'responded';
        }
        
        // Update history display
        updateMessageHistory();
        
        // Clear device screen
        clearDeviceScreen(deviceId);
        
        // Update device status
        updateDeviceStatus('Sent', deviceId, 'ready');
        
        // Reset current message for this device
        delete currentMessages[deviceId];
        
        // Show confirmation on foreman side
        showResponseConfirmation(responseText, deviceId);
        
    }, 1000);
}

// Clear specific device screen
function clearDeviceScreen(deviceId) {
    const deviceMessage = document.getElementById(`device${deviceId}Message`);
    const deviceButtons = document.getElementById(`device${deviceId}Buttons`);
    const deviceScreen = deviceMessage.closest('.device-screen');
    
    // Reset screen to normal state
    deviceScreen.className = 'device-screen';
    
    deviceMessage.innerHTML = '<div class="no-message">work work...</div>';
    deviceButtons.innerHTML = '';
}

// Update specific device status
function updateDeviceStatus(message, deviceId, type = 'ready') {
    const statusElement = document.getElementById(`device${deviceId}Status`);
    statusElement.textContent = message;
    statusElement.className = `status-text ${type}`;
    
    // Auto-reset to ready after a delay
    if (type !== 'ready') {
        setTimeout(() => {
            statusElement.textContent = 'OK';
            statusElement.className = 'status-text';
        }, 3000);
    }
}

// Show response confirmation on foreman side
function showResponseConfirmation(responseText, deviceId) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
        <strong>Response from Device #${deviceId.toString().padStart(3, '0')}:</strong><br>
        "${responseText}"
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Update message history display
function updateMessageHistory() {
    const historyElement = document.getElementById('history');
    
    if (messageHistory.length === 0) {
        historyElement.innerHTML = '<div style="color: #666; font-style: italic;">No messages sent yet</div>';
        return;
    }
    
    historyElement.innerHTML = messageHistory.map(message => {
        const timestamp = message.timestamp.toLocaleTimeString();
        const deviceList = message.devices.map(id => `#${id.toString().padStart(3, '0')}`).join(', ');
        
        // Status indicator
        let statusHtml = '';
        if (message.status === 'scheduled') {
            const scheduleTime = message.scheduledDate.toLocaleString();
            statusHtml = `<div class="message-status scheduled">📅 Scheduled for ${scheduleTime}${message.recurring ? ` (${message.recurring})` : ''}</div>`;
        }
        
        // Build responses section
        let responsesHtml = '';
        if (message.deviceResponses && Object.keys(message.deviceResponses).length > 0) {
            responsesHtml = '<div class="device-responses">';
            for (const [deviceId, responseData] of Object.entries(message.deviceResponses)) {
                const responseTime = responseData.responseTime ? responseData.responseTime.toLocaleTimeString() : '';
                responsesHtml += `
                    <div class="device-response">
                        Device #${deviceId.padStart(3, '0')}: "${responseData.response}" 
                        ${responseTime ? `(${responseTime})` : ''}
                    </div>
                `;
            }
            responsesHtml += '</div>';
        } else if (message.status === 'sent') {
            const pendingDevices = message.devices.filter(id => !message.deviceResponses || !message.deviceResponses[id]);
            if (pendingDevices.length > 0) {
                responsesHtml = `<div class="pending-responses" style="color: #ffc107;">
                    Waiting for responses from: ${pendingDevices.map(id => `#${id.toString().padStart(3, '0')}`).join(', ')}
                </div>`;
            }
        }
        
        return `
            <div class="history-item">
                <div class="history-header">
                    <div class="timestamp">${timestamp}</div>
                    <div class="history-actions">
                        <button class="reuse-btn" onclick="reuseMessage(${message.id})">Re-use</button>
                        ${message.status === 'scheduled' ? `<button class="delete-btn" onclick="deleteScheduledMessage(${message.id})">Delete</button>` : ''}
                    </div>
                </div>
                ${statusHtml}
                <div class="message-text">${message.text}</div>
                <div class="sent-to">Sent to devices: ${deviceList}</div>
                ${responsesHtml}
            </div>
        `;
    }).join('');
}

// Re-use message from history
function reuseMessage(messageId) {
    const message = messageHistory.find(m => m.id === messageId);
    if (!message) return;
    
    // Set template if available
    if (message.template) {
        document.getElementById('template').value = message.template;
    } else {
        document.getElementById('template').value = '';
    }
    
    // Set message text
    document.getElementById('message').value = message.text;
    updateCharCount();
    
    // Set response buttons
    if (message.responses && message.responses.length > 0) {
        document.getElementById('response1').value = message.responses[0] || '';
        document.getElementById('response2').value = message.responses[1] || '';
        document.getElementById('response3').value = message.responses[2] || '';
        
        document.getElementById('enable1').checked = message.responses.length > 0;
        document.getElementById('enable2').checked = message.responses.length > 1;
        document.getElementById('enable3').checked = message.responses.length > 2;
    }
    
    // Set device selection
    // First clear all
    clearAllDevices();
    // Then select the devices that were originally selected
    message.devices.forEach(deviceId => {
        const checkbox = document.getElementById(`device${deviceId}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    updateSelectedCount();
    
    // Scroll to top of form
    document.querySelector('.message-creator').scrollIntoView({ behavior: 'smooth' });
}

// Toggle schedule options visibility
function toggleScheduleOptions() {
    const scheduleEnabled = document.getElementById('scheduleEnabled').checked;
    const scheduleOptions = document.getElementById('scheduleOptions');
    
    if (scheduleEnabled) {
        scheduleOptions.style.display = 'block';
        // Set default date to today and time to current time + 1 hour
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours() + 1;
        const timeString = `${currentHour.toString().padStart(2, '0')}:00`;
        
        document.getElementById('scheduleDate').value = today;
        document.getElementById('scheduleTime').value = timeString;
    } else {
        scheduleOptions.style.display = 'none';
    }
}

// Clear message form
function clearMessageForm() {
    document.getElementById('template').value = '';
    document.getElementById('message').value = '';
    setDefaultResponses();
    document.getElementById('enable1').checked = true;
    document.getElementById('enable2').checked = true;
    document.getElementById('enable3').checked = false;
    
    // Clear scheduling options
    document.getElementById('scheduleEnabled').checked = false;
    document.getElementById('scheduleOptions').style.display = 'none';
    document.getElementById('scheduleDate').value = '';
    document.getElementById('scheduleTime').value = '';
    document.getElementById('recurring').value = '';
    
    updateCharCount();
}

// Demo function to simulate automatic responses (for testing)
function simulateWorkerResponse(deviceId = null) {
    if (!deviceId) {
        // Respond for all devices with current messages
        for (const [devId, messageId] of Object.entries(currentMessages)) {
            simulateWorkerResponse(parseInt(devId));
        }
        return;
    }
    
    if (currentMessages[deviceId]) {
        const responses = ['OK', 'Received', 'Will do', 'Need help', 'Almost done'];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        respondToMessage(randomResponse, deviceId);
    }
}

// Clear all device screens
function clearAllDeviceScreens() {
    for (let i = 1; i <= 4; i++) {
        clearDeviceScreen(i);
        updateDeviceStatus('OK', i);
        delete currentMessages[i];
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl + Enter to send message
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
    
    // Escape to clear all device screens (for demo purposes)
    if (event.key === 'Escape') {
        clearAllDeviceScreens();
    }
    
    // Number keys 1-4 to toggle device selection
    if (event.ctrlKey && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const deviceCheckbox = document.getElementById(`device${event.key}`);
        if (deviceCheckbox) {
            deviceCheckbox.checked = !deviceCheckbox.checked;
            updateSelectedCount();
        }
    }
});

// Add some demo functionality
console.log('Foreman-Worker Communication Mockup Loaded');
console.log('Keyboard shortcuts:');
console.log('- Ctrl + Enter: Send message');
console.log('- Ctrl + 1-4: Toggle device selection');
console.log('- Escape: Clear all device screens');
console.log('Functions:');
console.log('- simulateWorkerResponse(): Respond for all devices');
console.log('- simulateWorkerResponse(deviceId): Respond for specific device');
console.log('- selectAllDevices(): Select all devices');
console.log('- clearAllDevices(): Clear all device selections');

// Template Management Functions
let customTemplates = {}; // Store user-created templates

function loadTemplateForEdit() {
    const selectedTemplate = document.getElementById('editTemplate').value;
    const deleteBtn = document.querySelector('.delete-template-btn');
    
    if (selectedTemplate === '') {
        // Creating new template
        clearTemplateEditor();
        deleteBtn.style.display = 'none';
        return;
    }
    
    // Load existing template
    const template = messageTemplates[selectedTemplate] || customTemplates[selectedTemplate];
    if (template) {
        document.getElementById('templateKey').value = selectedTemplate;
        document.getElementById('templateName').value = getTemplateDisplayName(selectedTemplate);
        document.getElementById('templateIcon').value = template.icon;
        document.getElementById('templateType').value = template.type;
        document.getElementById('templateText').value = template.text;
        document.getElementById('templateResponse1').value = template.responses[0] || '';
        document.getElementById('templateResponse2').value = template.responses[1] || '';
        document.getElementById('templateResponse3').value = template.responses[2] || '';
        
        updateTemplateCharCount();
        deleteBtn.style.display = 'inline-block';
    }
}

function getTemplateDisplayName(templateKey) {
    const templateMap = {
        safety: 'Safety Alert',
        break: 'Break Time',
        meeting: 'Team Meeting',
        task: 'New Task Assignment',
        emergency: 'Emergency Protocol',
        office: 'Please come to office'
    };
    return templateMap[templateKey] || templateKey;
}

function updateTemplateCharCount() {
    const text = document.getElementById('templateText').value;
    document.getElementById('templateCharCount').textContent = text.length;
}

function saveTemplate() {
    const templateKey = document.getElementById('templateKey').value.trim();
    const templateName = document.getElementById('templateName').value.trim();
    const templateIcon = document.getElementById('templateIcon').value;
    const templateType = document.getElementById('templateType').value;
    const templateText = document.getElementById('templateText').value.trim();
    const response1 = document.getElementById('templateResponse1').value.trim();
    const response2 = document.getElementById('templateResponse2').value.trim();
    const response3 = document.getElementById('templateResponse3').value.trim();
    
    // Validation
    if (!templateKey) {
        alert('Please enter a Template ID');
        return;
    }
    
    if (!templateName) {
        alert('Please enter a Template Name');
        return;
    }
    
    if (!templateText) {
        alert('Please enter template message text');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(templateKey)) {
        alert('Template ID can only contain letters, numbers, and underscores');
        return;
    }
    
    // Build responses array
    const responses = [];
    if (response1) responses.push(response1);
    if (response2) responses.push(response2);
    if (response3) responses.push(response3);
    
    if (responses.length === 0) {
        responses.push('OK', 'Cancel'); // Default responses
    }
    
    // Create template object
    const newTemplate = {
        text: templateText,
        icon: templateIcon,
        responses: responses,
        type: templateType
    };
    
    // Save template
    if (messageTemplates[templateKey]) {
        // Update existing built-in template
        messageTemplates[templateKey] = newTemplate;
    } else {
        // Save as custom template
        customTemplates[templateKey] = newTemplate;
    }
    
    // Update the template selector dropdowns
    updateTemplateSelectors(templateKey, templateName);
    
    alert(`Template "${templateName}" saved successfully!`);
    clearTemplateEditor();
}

function updateTemplateSelectors(templateKey, templateName) {
    const templateSelect = document.getElementById('template');
    const editTemplateSelect = document.getElementById('editTemplate');
    const icon = document.getElementById('templateIcon').value;
    
    // Check if option already exists
    let existingOption = templateSelect.querySelector(`option[value="${templateKey}"]`);
    let existingEditOption = editTemplateSelect.querySelector(`option[value="${templateKey}"]`);
    
    if (existingOption) {
        // Update existing option
        existingOption.textContent = `${icon} ${templateName}`;
        existingEditOption.textContent = `${icon} ${templateName}`;
    } else {
        // Add new option
        const newOption = document.createElement('option');
        newOption.value = templateKey;
        newOption.textContent = `${icon} ${templateName}`;
        templateSelect.appendChild(newOption);
        
        const newEditOption = document.createElement('option');
        newEditOption.value = templateKey;
        newEditOption.textContent = `${icon} ${templateName}`;
        editTemplateSelect.appendChild(newEditOption);
    }
}

function deleteTemplate() {
    const templateKey = document.getElementById('templateKey').value.trim();
    
    if (!templateKey) {
        alert('No template selected for deletion');
        return;
    }
    
    if (messageTemplates[templateKey]) {
        alert('Cannot delete built-in templates. You can only edit them.');
        return;
    }
    
    if (!customTemplates[templateKey]) {
        alert('Template not found');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the template "${templateKey}"?`)) {
        delete customTemplates[templateKey];
        
        // Remove from selectors
        const templateSelect = document.getElementById('template');
        const editTemplateSelect = document.getElementById('editTemplate');
        
        const option = templateSelect.querySelector(`option[value="${templateKey}"]`);
        const editOption = editTemplateSelect.querySelector(`option[value="${templateKey}"]`);
        
        if (option) option.remove();
        if (editOption) editOption.remove();
        
        alert('Template deleted successfully!');
        clearTemplateEditor();
    }
}

function clearTemplateEditor() {
    document.getElementById('editTemplate').value = '';
    document.getElementById('templateKey').value = '';
    document.getElementById('templateName').value = '';
    document.getElementById('templateIcon').value = '⚠️';
    document.getElementById('templateType').value = 'info';
    document.getElementById('templateText').value = '';
    document.getElementById('templateResponse1').value = '';
    document.getElementById('templateResponse2').value = '';
    document.getElementById('templateResponse3').value = '';
    document.getElementById('templateCharCount').textContent = '0';
    document.querySelector('.delete-template-btn').style.display = 'none';
}

// Update the loadTemplate function to work with custom templates
function loadTemplate() {
    const selectedTemplate = document.getElementById('template').value;
    
    if (selectedTemplate === '') {
        clearMessage();
        return;
    }
    
    // Check both built-in and custom templates
    const template = messageTemplates[selectedTemplate] || customTemplates[selectedTemplate];
    
    if (template) {
        document.getElementById('message').value = template.text;
        
        // Set response buttons
        document.getElementById('response1').value = template.responses[0] || '';
        document.getElementById('response2').value = template.responses[1] || '';
        document.getElementById('response3').value = template.responses[2] || '';
        
        // Enable/disable response checkboxes based on content
        document.getElementById('enable1').checked = !!template.responses[0];
        document.getElementById('enable2').checked = !!template.responses[1];
        document.getElementById('enable3').checked = !!template.responses[2];
        
        updateCharCount();
    }
}
