<template>
    <h1>{{ titel }}</h1>
     <div>
        <p v-if="backendResponse">
            {{ backendResponse }}
        </p>
        <p v-else>
            Warte auf deine Eingabe...
        </p>
    </div>
    <div>
        <input
        type="text"
        v-model="userInput"
        :disabled="isSending"
        placeholder="Gib hier deinen Text ein..."
        />
        <button
        @click="sendMessage"
        :disabled="!userInput.trim() || isSending"
        >
        {{ isSending ? 'Sende...' : 'Senden an Backend' }}
        </button>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    const titel = 'Mensabot Testseite';

    const userInput = ref('');
    const backendResponse = ref('');
    const isSending = ref(false);

    async function sendMessage() {
        if (!userInput.value.trim()){
            return;
        }

        isSending.value = true;
        const textToSend = userInput.value;

        try{
            const response = await fetch('/api/chat', { 
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: textToSend }) 
            });
            const data = await response.json();
            backendResponse.value = data.reply || 'Keine Antwort vom Backend erhalten.';

        } catch (error) {
            console.error('Fehler beim Senden:', error);
            backendResponse.value = 'Fehler beim Verbinden mit dem Backend.';
        } finally { //zurücksetzen
            userInput.value = ''; 
            isSending.value = false;
        }
    }
    
</script>