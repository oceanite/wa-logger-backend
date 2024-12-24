document.addEventListener('DOMContentLoaded', () => {
    // Fetch and display chatrooms when the page loads
    fetchChatrooms();

    // UserID of current user:
    const thisUserID = "6285174388804@c.us";  

    // Selectors for common DOM elements
    const searchContact = document.querySelector('.search-contact');
    const chatBody = document.getElementById('chatContainer');
    const chatInput = document.querySelector('.chat-input');
    const chatInputField = document.getElementById("message-input-form");
    const mediaInput = document.getElementById('mediaInput');
    const addMediaButton = document.querySelector('.btn-add-media');

    let currentChatroomID = null;
    
    // Clear the textarea content 
    chatInputField.value = "";

    function saveDraft(chatroomId, draft) {
        if (chatroomId) {
            localStorage.setItem(`draft_${chatroomId}`, draft);
        }
    }

    function loadDraft(chatroomId) {
        const draft = localStorage.getItem(`draft_${chatroomId}`);
        return draft || ""; // Return empty string if no draft exists
    }

    function clearDraft(chatroomId) {
        if (chatroomId) {
            localStorage.removeItem(`draft_${chatroomId}`);
        }
    }

    async function fetchContact() {
        try {
            const responseContact = await fetch("https://wa-logger-back.vercel.app/api/contacts");
            const contact = await responseContact.json();

            return contact;
        } catch (error) {
            console.error('Error fetching contact info:', error);
        }
    }

    // Fetch chatroom data and display it in the sidebar
    async function fetchChatrooms() {
        console.log("Fetching chatrooms...");
        try {
            const response = await fetch("https://wa-logger-back.vercel.app/api/chatrooms");
            const chatrooms = await response.json();

            const contacts = await fetchContact();

            // Check for drafts and add a `hasDraft` property
            chatrooms.forEach(chatroom => {
                const draft = localStorage.getItem(`draft_${chatroom.chatID}`);
                chatroom.hasDraft = !!draft; // Boolean: true if draft exists
            });

            // Sort chatrooms: prioritize those with drafts
            chatrooms.sort((a, b) => b.hasDraft - a.hasDraft);

            displayChatrooms(chatrooms, contacts);
        } catch (error) {
            console.error('Error fetching chatrooms:', error);
        }
    }

    // Display chatrooms list in the sidebar
    function displayChatrooms(chatrooms, contacts) {
        const chatroomsList = document.getElementById('chatrooms-list');
        chatroomsList.innerHTML = '';  // Clear the list
    
        chatrooms.forEach(chatroom => {
            console.log("Chatrooms data:", chatroom);

            // Check if chatID and messages are defined before processing
            if (!chatroom.chatID || !chatroom.messages) {
                console.warn("Skipping chatroom with missing data:", chatroom);
                return;  // Skip this iteration if data is missing
            }
    
            const chatID = chatroom.chatID;
            const chatName = formatContactName(chatID, contacts);
            const lastTime = formatLastChatTime(chatroom.last_time);
            const chatroomItem = createChatroomItem(chatroom, chatName, lastTime);
            
            chatroomsList.appendChild(chatroomItem);
        });

        // Add click listeners to each chatroom item after the list is populated
        addChatroomClickListeners();
    }

    function createChatroomItem(chatroom, contact, lastTime) {
        const chatroomItem = document.createElement('a');
        chatroomItem.href = "#";
        chatroomItem.classList.add("contact-list", "list-group-item", "list-group-item-action", "d-flex", "align-items-center");
    
        // Store messages in a data attribute for filtering
        chatroomItem.setAttribute('data-messages', JSON.stringify(chatroom.messages.map(msg => ({ body: msg.body }))));
    
        if (chatroom.hasDraft) {
            const draft = loadDraft(chatroom.chatID);
            chatroomItem.innerHTML = `
                <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                <div class="row w-100">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="contact-name mb-1">${contact}</h5>
                        <small class="last-time">${lastTime}</small>
                    </div>
                    <p class="message-preview mb-1"><span style="color: #15976e;">Draft: </span>${draft.trim()}</p>
                </div>
            `;
        } else {
            if (chatroom.hasMedia) {
                chatroomItem.innerHTML = `
                    <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                    <div class="row w-100">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="contact-name mb-1">${contact}</h5>
                            <small class="last-time">${lastTime}</small>
                        </div>
                        <p class="message-preview mb-1"><i class="bi bi-camera"></i> Media</p>
                    </div>
                `;
            } else {
                chatroomItem.innerHTML = `
                    <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                    <div class="row w-100">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="contact-name mb-1">${contact}</h5>
                            <small class="last-time">${lastTime}</small>
                        </div>
                        <p class="message-preview mb-1">${formatMsg(chatroom.last_chat)}</p>
                    </div>
                `;
            }
            
        }

        chatroomItem.dataset.remoteId = chatroom.chatID;
        chatroomItem.dataset.lastChat = chatroom.last_chat;
        chatroomItem.dataset.hasDraft = chatroom.hasDraft;
        chatroomItem.dataset.lastTime = chatroom.last_time;
        
        return chatroomItem;
    }
    
    function updateDraftIndicator(chatroom) {
        const remoteId = chatroom.dataset.remoteId;
        const lastChat = chatroom.dataset.lastChat;

        if (chatroom.classList.contains('selected')) {
            chatroom.querySelector('.message-preview').textContent = formatMsg(lastChat);
        } else {
            const draft = localStorage.getItem(`draft_${remoteId}`);
            if (draft) {
                chatroom.querySelector('.message-preview').innerHTML = `<span style="color: #15976e;">Draft: </span>${draft.trim()}`;
            } else {
                chatroom.querySelector('.message-preview').textContent = formatMsg(lastChat);
            }
        }
    }

    function sortChatrooms() {
        const chatroomsList = document.getElementById('chatrooms-list');
        const chatroomItems = Array.from(chatroomsList.children);
    
        chatroomItems.sort((a, b) => {
            const aHasDraft = a.dataset.hasDraft === "true";
            const bHasDraft = b.dataset.hasDraft === "true";
            const aLastTime = Number(a.dataset.lastTime);
            const bLastTime = Number(b.dataset.lastTime);
    
            // Prioritize chatrooms with drafts
            if (bHasDraft !== aHasDraft) {
                return bHasDraft - aHasDraft;
            }
    
            // If both have drafts or both don't, sort by last chat time
            return bLastTime - aLastTime;
        });
    
        // Append sorted elements back into the chatrooms list
        chatroomItems.forEach(item => chatroomsList.appendChild(item));
    }

    // Format contact name based on chat ID
    function formatContactName(chatID, contacts) {
        for (let i = 0; i < contacts.length; i++){
            if (contacts[i].uid === chatID) {
                return contacts[i].name;
            }
        }
        return chatID.split('@')[0]
    }

    // Format the timestamp for last chat time display
    function formatLastChatTime(timestamp) {
        const currentDate = new Date();
        const lastChatDate = new Date(timestamp * 1000);
        const diffDays = Math.floor((currentDate - lastChatDate) / (1000 * 3600 * 24));

        if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays >= 2 && diffDays <= 7) {
            return lastChatDate.toLocaleDateString('en-US', { weekday: 'long' });
        } else if (diffDays > 7) {
            return `${lastChatDate.getDate()}/${lastChatDate.getMonth() + 1}/${lastChatDate.getFullYear()}`;
        } else {
            return lastChatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
    }

    function formatMsg(message) {
        if (message.includes("<<") || message.includes(">>")) {
            let indexLeft = message.indexOf("<<");
            let indexRight = message.indexOf(">>");

            if (indexLeft !== -1) {
                return message.substring(indexLeft + 3).trim();
            } else if (indexRight !== -1) {
                return message.substring(indexRight + 3).trim();
            }
        } else {
            return message;
        }
    }

    // Add click listeners to each chatroom item
    function addChatroomClickListeners() {
        const chatroomItem = document.querySelectorAll('.contact-list');
        chatroomItem.forEach(contact => {
            contact.addEventListener('click', () => {
                // Remove "selected" class from all chatrooms
                chatroomItem.forEach(item => {
                    item.classList.remove('selected');
                    updateDraftIndicator(item);
                });

                // Add "selected" class to the clicked chatroom 
                contact.classList.add('selected');
                updateDraftIndicator(contact);
                console.log(contact.dataset.hasDraft);

                const remoteId = contact.dataset.remoteId;
                const contactName = contact.querySelector('.contact-name').textContent;
                currentChatroomID = remoteId;

                setupChatHeader(contactName);
                revealChatInput();
                loadChatHistory(remoteId);
                chatInputField.value = loadDraft(remoteId);
            });
        });
    }

    // Set up the chat header
    function setupChatHeader(contactName) {
        const chatMain = document.querySelector('.chat-main');
        const chatHeader = chatMain.querySelector('.chat-header');
    
        if (!chatHeader) {
            console.error('chatHeader not found!');
            return;
        }

        chatHeader.classList.remove('d-none');
    
        chatHeader.innerHTML = '';
        chatHeader.innerHTML = `
            <div class="d-flex align-items-start">
                <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                <div class="d-flex flex-column align-items-start">
                    <h5 class="contact-name mb-0 text-white">${contactName}</h5>
                    <small class="last-time">Last chat on -</small>
                </div>
            </div>
            <div class="d-flex align-items-center">
                <input type="text" class="search-message form-control me-2" placeholder="Search messages...">
                <i class="bi bi-gear settings-icon"></i>
            </div>
        `;
    
        // Attach event listener for searching messages
        const searchMessage = chatHeader.querySelector('.search-message');
        searchMessage.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            const messages = chatBody.querySelectorAll('.message');
            const separators = chatBody.querySelectorAll('.time-separator');
    
            messages.forEach(message => {
                const messageText = message.querySelector('.message-bubble').textContent.toLowerCase();
    
                if (messageText.includes(searchTerm)) {
                    message.classList.remove('d-none');
                } else {
                    message.classList.add('d-none');
                }
            });

            // Update time separator visibility
            separators.forEach(separator => {
                // Check if there are any visible messages after the separator
                let nextElement = separator.nextElementSibling;
                let hasVisibleMessages = false;

                while (nextElement && !nextElement.classList.contains('time-separator')) {
                    if (!nextElement.classList.contains('d-none')) {
                        hasVisibleMessages = true;
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }

                // Toggle visibility of the separator based on visible messages
                if (hasVisibleMessages) {
                    separator.classList.remove('d-none');
                } else {
                    separator.classList.add('d-none');
                }
            });
        });
    }

    // Reveal the chat input area
    function revealChatInput() {
        chatInput.classList.remove('d-none');
    }

    chatInputField.addEventListener("input", function () {
        // Dynamically change the height of the textarea on input
        chatInputField.style.height = "auto";
        chatInputField.style.height = chatInputField.scrollHeight + "px";
    
        if (chatInputField.value !== "") {
            saveDraft(currentChatroomID, chatInputField.value);
    
            const selectedChatroom = document.querySelector(`[data-remote-id="${currentChatroomID}"]`);
            if (selectedChatroom) {
                selectedChatroom.dataset.hasDraft = "true"; // Set the draft flag to false
            }
        } else {
            clearDraft(currentChatroomID);
    
            // Update the `hasDraft` flag in the chatroom dataset
            const selectedChatroom = document.querySelector(`[data-remote-id="${currentChatroomID}"]`);
            if (selectedChatroom) {
                selectedChatroom.dataset.hasDraft = "false"; // Set the draft flag to false
            }
        }
    
        // After saving or clearing the draft, re-sort the chatrooms
        sortChatrooms();
    });    

    // Load chat history for the selected contact
    async function loadChatHistory(remoteId) {
        console.log("Fetching chat history for " + remoteId);
        chatBody.innerHTML = '';
        try {
            const response = await fetch(`https://wa-logger-back.vercel.app/api/chats/${remoteId}`);
            if (!response.ok) throw new Error(`Error fetching chat history: ${response.statusText}`);
            
            const messages = await response.json();
            displayChatHistory(messages);
        } catch (error) {
            console.error("Error loading chat history:", error);
            chatBody.innerHTML = `<p>Error loading chat history.</p>`;
        }
    }

    // Display chat history in chat body
    async function displayChatHistory(messages) {
        const contacts = await fetchContact();

        if (messages.length === 0) {
            chatBody.innerHTML = '<p>No chat history available.</p>';
            return;
        }

        const lastChatTime = formatLastChatTime(messages[messages.length - 1].timestamp);
        document.querySelector('.chat-header .last-time').textContent = `Last chat on ${lastChatTime}`;

        let lastDate = null;

        messages.forEach(msg => {
            const currentDate = new Date(msg.timestamp * 1000);
            const formattedDate = currentDate.toDateString();

            // Insert a time separator if the date changes
            if (formattedDate !== lastDate) {
                const separator = document.createElement('div');
                separator.classList.add('time-separator', 'd-flex', 'align-items-center', 'justify-content-center');
                separator.textContent = formatTimeSeparator(currentDate);
                chatBody.appendChild(separator);
                lastDate = formattedDate; // Update last date
            }

            const messageDiv = document.createElement('div');

            if (currentChatroomID.includes("@g.us") && !msg.fromMe) {
                // Group message (received)
                const messageContainer = document.createElement('div');
                messageContainer.classList.add('container');
                messageContainer.innerHTML = `
                    <div class="message received d-flex justify-content-start">
                        <div class="d-flex">
                            <img src="./img/default-profile-picture-01.png" alt="${formatContactName(msg.author, contacts)}'s profile picture" class="profile-chat">
                        </div>
                        <div class="d-flex flex-column">
                            <div class="notify-name">${formatContactName(msg.author, contacts)}</div>
                            <div class="message-bubble">
                                <div class="message-body">${formatMsg(msg.body)}<div>
                                <small class="timestamp">${formatTimestamp(msg.timestamp)}</small>
                            </div>
                        </div>
                    </div>
                `;

                if (msg.hasQuotedMsg) {
                    messageBubble = messageContainer.querySelector('.message-bubble');
                    const quotedMessage = document.createElement('div');
                    quotedMessage.classList.add('quoted-message');

                    let quotedParticipant = "";
                    if (msg._data.quotedParticipant === thisUserID) {
                        quotedParticipant = "You";
                    } else {
                        quotedParticipant = formatContactName(msg._data.quotedParticipant, contacts);
                    }

                    quotedMessage.innerHTML = `
                        <div class="notify-name">${quotedParticipant}</div>
                        ${formatMsg(msg._data.quotedMsg.body)}
                    `;

                    messageBubble.insertBefore(quotedMessage, messageBubble.firstChild);
                }
                chatBody.appendChild(messageContainer);
            } else {
                if (msg.fromMe) {
                    messageDiv.classList.add('message', 'sent', 'd-flex', 'row', 'justify-content-end');
                } else {
                    messageDiv.classList.add('message', 'received', 'd-flex', 'row', 'justify-content-start');
                }
                
                const messageBubble = document.createElement('div');
                messageBubble.classList.add('message-bubble');
                if (msg.hasQuotedMsg) {
                    const quotedMessage = document.createElement('div');
                    quotedMessage.classList.add('quoted-message');
                    quotedMessage.innerHTML = `
                        <div class="notify-name">${msg._data.notifyName || msg._data.quotedParticipant.split('@')[0]}</div>
                        ${formatMsg(msg._data.quotedMsg.body)}
                    `;

                    messageBubble.appendChild(quotedMessage);
                }

                if (msg.hasMedia) {
                    createFileElement(msg.files, messageBubble, messageDiv);
                }

                if (msg.body != null) {
                    const messageBody = document.createElement('div');
                    messageBody.classList.add('message-body');
                    messageBody.innerHTML = `${formatMsg(msg.body)}`;
                    messageBubble.appendChild(messageBody);
                }

                const timestamp = document.createElement('small');
                timestamp.classList.add('timestamp');
                timestamp.textContent = formatTimestamp(msg.timestamp);

                messageBubble.appendChild(timestamp);
                messageDiv.appendChild(messageBubble);
                chatBody.appendChild(messageDiv);
            }
        });
    }

    // Format date for time separator
    function formatTimeSeparator(date) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
    
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(); // Display full date
        }
    }

    // Format timestamp to "hh:mm AM/PM"
    function formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    // Filter contacts and associated messages in the sidebar
    searchContact.addEventListener('input', function () {
        const searchQuery = searchContact.value.toLowerCase().trim();

        document.querySelectorAll('.contact-list').forEach(contact => {
            const contactName = contact.querySelector('.contact-name').textContent.toLowerCase();
            const messages = JSON.parse(contact.getAttribute('data-messages') || "[]"); // Safely parse data-messages

            // Check if contact name or any associated message matches the query
            const isNameMatch = contactName.includes(searchQuery);
            const isMessageMatch = messages.some(message => message.body.toLowerCase().includes(searchQuery));

            if (isNameMatch || isMessageMatch) {
                contact.classList.remove('d-none');
            } else {
                contact.classList.add('d-none');
            }
        });
    });

    function generateID() {
        return 'xxxxxxxxxxxxxx'.replace(/[x]/g, function () {
            return (Math.random() * 16 | 0).toString(16);
        });
    }

    async function sendMessage() {
        const messageContent = chatInputField.value.trim();

        if (messageContent === null) {
            console.warn("Input field is empty");
            return;
        }

        const ID = generateID();

        const messageData = {
            _data: {
                id: {
                    fromMe: true,
                    remote: currentChatroomID,
                    id: ID,
                    _serialized: `true_${currentChatroomID}_${ID}`,
                },
                body: messageContent,
                type: "chat",
                t: Math.floor(Date.now() / 1000),
                from: thisUserID,
                to: currentChatroomID,
            },
            localId: {
                fromMe: true,
                remote: currentChatroomID,
                id: ID,
                _serialized: `true_${currentChatroomID}_${ID}`,
            },
            body: messageContent,
            type: "chat",
            timestamp: Math.floor(Date.now() / 1000),
            from: thisUserID,
            to: currentChatroomID,
            deviceType: "web",
            fromMe: true,
        }

        try {
            const response = await fetch(`https://wa-logger-back.vercel.app/api/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(messageData),
            });

            if (!response.ok) {
                const errorDetails = await response.json();
                throw new Error(`Error sending message: ${errorDetails.error || response.statusText}`);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
            }
    
            const result = await response.json();
            console.log("Message sended successfully:", result);

            // Tampilkan pesan setelah berhasil mengirim
            loadChatHistory(currentChatroomID);
            // Hapus isi chat input field
            chatInputField.value = "";
            // Hapus draft dari local storage
            clearDraft(currentChatroomID);
            // Update tampilan list chatroom
            fetchChatrooms();
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }

    document.querySelector('.btn-send').addEventListener("click", sendMessage);
    chatInputField.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    })

    // Open file selector when attach button is clicked
    addMediaButton.addEventListener("click", () => {
        mediaInput.click();
    });

    // Handle file selection
    mediaInput.addEventListener("change", (e) => {
        handleFiles(e.target.files);
    });

    let fileCount = 0;
    let fileIndex = 0;
    function handleFiles(files) {
        const container = document.querySelector('.container-fluid');
        fileCount += files.length;

        let preview = document.querySelector('.file-preview');
        if (!preview) {
            preview = document.createElement("div");
            preview.classList.add('file-preview', 'col-md-8', 'p-0', 'w-100', 'justify-content-center');
            preview.innerHTML = `
                <div class="d-flex align-items-start">
                    <button class="btn btn-clear-preview btn-danger d-flex align-items-center justify-content-center">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="preview-container d-flex align-items-center justify-content-center">
                    <!-- Insert single file preview here -->
                </div>
                <div class="caption d-flex align-items-center justify-content-center text-center">
                    <textarea 
                        class="caption-input form-control justify-content-center me-2"
                        id="caption-input-form" 
                        placeholder="Add a caption"
                        rows="1"></textarea>
                </div>
                <div class="container">
                    <div class="d-flex justify-content-center" style="gap: 24px;">
                        <div class="file-list d-flex align-items-center justify-content-center" id="fileListContainer">
                            <!-- File list -->
                        </div>
                        <button class="btn btn-send-file btn-success d-flex align-items-center justify-content-center">
                            <i class="bi bi-send"></i>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(preview);

            let dropbox1 = document.querySelector('.file-preview');
            dropbox1.addEventListener("dragenter", dragenter, false);
            dropbox1.addEventListener("dragover", dragover, false);
            dropbox1.addEventListener("drop", drop, false);
        }

        const fileListContainer = document.getElementById("fileListContainer");

        document.querySelector('.btn-clear-preview').addEventListener("click", () => {
            document.querySelector('.file-preview').remove();
            document.getElementById("mediaInput").value = "";
            URL.revokeObjectURL(blobUrl);
            fileCount = 0;
            fileIndex = 0;
        });

        document.querySelector('.btn-send-file').addEventListener("click", () => {
            sendFile();
            document.querySelector('.file-preview').remove();
        });

        let padding = 0;
        if (fileCount === 8) {
            padding = 85;
            fileListContainer.style.paddingLeft = `${padding}px`;
        } else if (fileCount === 9) {
            padding = 200;
            fileListContainer.style.paddingLeft = `${padding}px`;
        } else if (fileCount > 9) {
            padding = calc(200 + 112 * (fileCount - 9));
            fileListContainer.style.paddingLeft = `${padding}px`;
        }
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
        
            // Jika file adalah image
            if (file.type.startsWith("image/")) {
                reader.onload = function (e) {
                    const button = document.createElement("button");
                    button.classList.add('btn', 'file-thumbnail', 'btn-outline-success', 'align-items-center');
                    button.style.backgroundImage = `url('${e.target.result}')`;
                    button.style.backgroundSize = "auto 110px";
                    button.style.backgroundRepeat = "no-repeat";
                    button.style.backgroundPosition = "center";
                    button.dataset.index = fileIndex;
                    fileIndex++;
                    button.innerHTML = `
                        <span class="remove-media d-none">X</span>
                    `;
        
                    button.addEventListener("click", () => {
                        showFullPreview(file, e.target.result);
                    });
        
                    fileListContainer.appendChild(button);
        
                    // Menampilkan preview pertama kali
                    if (index === 0) {
                        showFullPreview(file, e.target.result);
                    }
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith("video/")) {
                reader.onload = function (e) {
                    console.log("File successfully read:", e.target.result);
                };
                reader.onerror = function () {
                    console.error("Error reading file:", reader.error);
                };
                reader.readAsDataURL(file);

                const blobUrl = URL.createObjectURL(file); // Buat Blob URL dari file video
                console.log(blobUrl);
            
                generateVideoThumbnail(blobUrl, function (thumbnail) {
                    const button = document.createElement("button");
                    button.classList.add('btn', 'file-thumbnail', 'btn-outline-success', 'align-items-center');
                    button.style.backgroundImage = `url('${thumbnail}')`;
                    button.style.backgroundSize = "cover";
                    button.style.backgroundRepeat = "no-repeat";
                    button.style.backgroundPosition = "center";
                    button.dataset.index = fileIndex;
                    fileIndex++;
                    button.innerHTML = `
                        <span class="remove-media d-none">X</span>
                    `;
            
                    button.addEventListener("click", () => {
                        showFullPreviewVideo(file, blobUrl); // Gunakan Blob URL untuk preview video
                    });
            
                    fileListContainer.appendChild(button);
            
                    // Menampilkan preview pertama kali
                    if (index === 0) {
                        showFullPreviewVideo(file, blobUrl); // Gunakan Blob URL untuk preview pertama
                    }
                });
            }            
            // Jika file bukan image/video
            else {
                const button = document.createElement("button");
                button.classList.add('btn', 'file-thumbnail', 'btn-outline-success', 'align-items-center');
                button.dataset.index = fileIndex;
                fileIndex++;
                button.innerHTML = `
                    <i class="bi bi-file-earmark-text" style="font-size: 28px;"></i>
                    <span class="remove-media d-none">X</span>
                `;
        
                button.addEventListener("click", () => {
                    showFullPreviewFile(file);
                });
        
                fileListContainer.appendChild(button);
        
                // Menampilkan preview pertama kali untuk non-image
                if (index === 0) {
                    showFullPreviewFile(file);
                }
            }
        });        
    }
    
    function showFullPreview(file, src) {
        console.log("Previewing file:", file.name);
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.innerHTML = `
            <div class="preview-file">
                <img src="${src}" alt="${file.name}" style="width: auto; height: auto; max-width:90vh; max-height: 310px;">
            </div>
        `;
    }

    function showFullPreviewVideo(file, src) {
        console.log("Previewing file:", file.name);
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.innerHTML = `
            <div class="preview-file">
                <video id="video-element" height="310" controls>
                    <source id="video-source" src="${src}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    }
    

    function showFullPreviewFile(file) {
        console.log("Previewing file:", file.name);
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.innerHTML = `
            <div class="preview-file justify-content-center align-items-center text-center">
                <h4 class="file-name">${file.name}</h4>
                <i class="file-icon bi bi-file-earmark-text"></i>
                <p class="file-size">${formatFileSize(file.size)}</p>
            </div>
        `;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes"; // Jika ukuran file 0
        
        const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024)); // Menentukan indeks satuan
        const formattedSize = (bytes / Math.pow(1024, i)).toFixed(2); // Membagi ukuran file dan membulatkan 2 desimal
        
        return `${formattedSize} ${sizes[i]}`;
    }

    // Handle drag and drop
    let dropbox;

    dropbox = document.querySelector('.chat-main');
    dropbox.addEventListener("dragenter", dragenter, false);
    dropbox.addEventListener("dragover", dragover, false);
    dropbox.addEventListener("drop", drop, false);

    function dragenter(e) {
        e.stopPropagation();
        e.preventDefault();
    }

    function dragover(e) {
        e.stopPropagation();
        e.preventDefault();
    }

    function drop(e) {
        e.stopPropagation();
        e.preventDefault();
        const dt = e.dataTransfer;
        const files = dt.files;
        if (currentChatroomID != null) {
            handleFiles(files);

            const dataTransfer = new DataTransfer();
            [...files].forEach(file => dataTransfer.items.add(file));
            mediaInput.files = dataTransfer.files;
        } else {
            document.getElementById("mediaInput").value = "";
            alert("No chat room currently selected");
        }
    }

    async function sendFile() {
        console.log(mediaInput.files.length, currentChatroomID);
        if (mediaInput.files.length > 0 && currentChatroomID != null) {
            const formData = new FormData();
            const messageContent = document.getElementById("caption-input-form").value.trim();

            // Add files to formData
            Array.from(mediaInput.files).forEach(file => {
                formData.append("files", file);
            });
            formData.append("chatroomID", currentChatroomID);
            const time = Math.floor(Date.now() / 1000);
            formData.append("timestamp", time);
            let indexTotal = mediaInput.files.length - 1;
            formData.append("total", indexTotal);

            const ID = generateID();

            const messageData = {
                _data: {
                    id: {
                        fromMe: true,
                        remote: currentChatroomID,
                        id: ID,
                        _serialized: `true_${currentChatroomID}_${ID}`,
                    },
                    body: messageContent,
                    type: "chat",
                    t: time,
                    from: thisUserID,
                    to: currentChatroomID,
                },
                localId: {
                    fromMe: true,
                    remote: currentChatroomID,
                    id: ID,
                    _serialized: `true_${currentChatroomID}_${ID}`,
                },
                mediaKey: `${currentChatroomID}_${time}`,
                hasMedia: true,
                body: messageContent,
                type: "chat",
                timestamp: time,
                from: thisUserID,
                to: currentChatroomID,
                deviceType: "web",
                fromMe: true,
            }

            try {
                const response = await fetch(`https://wa-logger-back.vercel.app/api/send-file`, {
                    method: "POST",
                    body: formData,
                });

                const responseMes = await fetch(`https://wa-logger-back.vercel.app/api/send`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(messageData),
                });

                if (!response.ok) {
                    alert("Failed sending file(s)");
                    const errorDetails = await response.json();
                    throw new Error(`Error sending file(s): ${errorDetails.error || response.statusText}`);
                }

                if (!responseMes.ok) {
                    const errorDetails = await responseMes.json();
                    throw new Error(`Error sending message: ${errorDetails.error || response.statusText}`);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
                }

                const result = await response.json();
                const resultMes = await responseMes.json();
                console.log("Message and file sended successfully:", result, resultMes);
    
                loadChatHistory(currentChatroomID);
                mediaInput.value = "";
                fetchChatrooms();
            } catch (error) {
                console.error("Error sending file(s):", error);
            }
        } else {
            alert("No files selected or chatroom not selected.");
        }
    }

    function createFileElement(files, messageBubble, messageDiv) {
        let currentIndex = 0;
        files.forEach((file) => {
            const fileContent = document.createElement('div');
            fileContent.classList.add('media-content');
            if (file.mimetype.startsWith("image/")) {
                const img = document.createElement('img');
                img.classList.add('image-bubble');
                img.src = file.path;
                fileContent.appendChild(img);

                fileContent.addEventListener("click", ()=> {
                    imagePreview(file);
                });
            } else if (file.mimetype.startsWith("video/")) {
                const thumbnail = document.createElement('img');
                thumbnail.classList.add('video-bubble');
                thumbnail.src = './img/default-thumbnail.png';  // Default thumbnail

                generateVideoThumbnail(file.path, function(thumbnailUrl) {
                    console.log('Thumbnail URL:', thumbnailUrl);
                    thumbnail.src = thumbnailUrl;
                });

                const overlayVideo = document.createElement('div');
                overlayVideo.classList.add('overlay-video');
                overlayVideo.innerHTML = `
                    <span class="play-overlay"><i class="bi bi-play-circle"></i></span>
                `;
                fileContent.appendChild(thumbnail);
                fileContent.appendChild(overlayVideo);

                fileContent.addEventListener("click", ()=> {
                    videoPreview(file);
                });
            } else {
                fileContent.classList.add('d-flex', 'justify-content-between');
                fileContent.innerHTML = `
                    <div class="d-flex file-content-icon align-items-center justify-content-center">
                        <i class="bi bi-file-earmark-text" style="margin: 16px; font-size: 28px;"></i>
                    </div>
                    <div class="d-flex flex-column text-start ms-3" style="margin: 8px;">
                        <div class="chat-file-name">${file.filename}</div>
                        <div class="file-information">
                            <div class="chat-file-size">${formatFileSize(file.size)}</div>
                        </div>
                    </div>
                `;

                fileContent.addEventListener("click", () => {
                    downloadFile(file);
                });
            }

            if (currentIndex === file.indexTotal) {
                messageBubble.appendChild(fileContent);
                currentIndex = 0;
            } else {
                const newBubble = document.createElement('div');
                newBubble.classList.add('message-bubble');

                newBubble.appendChild(fileContent);
                messageDiv.appendChild(newBubble);
                chatBody.appendChild(messageDiv);

                currentIndex++;
            }
        });
    }

    function generateVideoThumbnail(videoUrl, callback) {
        const video = document.createElement('video');
        video.src = encodeURIComponent(videoUrl);
        
        video.onloadeddata = function () {
            video.currentTime = 3; // Ambil frame di detik ke-3
        };
        
        video.onseeked = function () {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
    
            // Atur ukuran canvas sesuai dengan video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Konversi canvas ke data URL
            const thumbnail = canvas.toDataURL('image/png');
            callback(thumbnail);
        };
    }    

    function imagePreview(file){
        const container = document.querySelector('.container-fluid');

        let preview = document.querySelector('.file-preview');
        if (!preview) {
            preview = document.createElement("div");
            preview.classList.add('file-preview', 'col-md-8', 'p-0', 'w-100', 'justify-content-center');
            preview.innerHTML = `
                <div class="d-flex align-items-start">
                    <button class="btn btn-clear-preview btn-danger d-flex align-items-center justify-content-center">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="d-flex align-items-end justify-content-end">
                    <button class="btn btn-download btn-outline-success d-flex align-items-center justify-content-center">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
                <div class="image-preview-container d-flex align-items-center justify-content-center">
                    <!-- Insert single file preview here -->
                    <div class="preview-file d-flex align-items-center justify-content-center">
                        <img src="${file.path}" alt="${file.filename}" style="width: auto; height: auto; max-width:95vh; max-height: 450px;">
                    </div>
                </div>
            `;

            container.appendChild(preview);
        }
        
        document.querySelector('.btn-clear-preview').addEventListener("click", () => {
            document.querySelector('.file-preview').remove();
        });
        
        document.querySelector('.btn-download').addEventListener("click", () => {
            downloadFile(file)
        });
    }

    function videoPreview(file){
        const container = document.querySelector('.container-fluid');

        let preview = document.querySelector('.file-preview');
        if (!preview) {
            preview = document.createElement("div");
            preview.classList.add('file-preview', 'col-md-8', 'p-0', 'w-100', 'justify-content-center');
            preview.innerHTML = `
                <div class="d-flex align-items-start">
                    <button class="btn btn-clear-preview btn-danger d-flex align-items-center justify-content-center">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="d-flex align-items-end justify-content-end">
                    <button class="btn btn-download btn-outline-success d-flex align-items-center justify-content-center">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
                <div class="video-preview-container d-flex align-items-center justify-content-center">
                    <!-- Insert single file preview here -->
                    <div class="preview-file">
                        <video id="video-element" height="450" crossorigin="anonymous" controls>
                            <source id="video-source" src="${encodeURIComponent(file.path)}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            `;

            container.appendChild(preview);
        }
        
        document.querySelector('.btn-clear-preview').addEventListener("click", () => {
            document.getElementById("video-element").pause();
            document.getElementById("video-source").src = "";
            document.querySelector('.file-preview').remove();
        });

        document.querySelector('.btn-download').addEventListener("click", () => {
            downloadFile(file)
        });
    }

    function downloadFile(file) {
        if (!file.storedName) {
            console.error("File information is incomplete");
            return;
        }

        const downloadUrl = `https://wa-logger-back.vercel.app/download/${encodeURIComponent(file.storedName)}`;

        // Create <a> to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.filename; // Nama file yang akan diunduh

        // Add <a> to DOM and triggers click event
        document.body.appendChild(link);
        link.click();

        // Remove <a> after click event
        document.body.removeChild(link);
    }
});