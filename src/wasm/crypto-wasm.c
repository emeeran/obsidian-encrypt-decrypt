#include <emscripten.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

// AES-GCM encryption constants
#define AES_KEY_SIZE 32
#define GCM_IV_SIZE 12
#define GCM_TAG_SIZE 16
#define PBKDF2_ITERATIONS 100000
#define SALT_SIZE 16

// Error codes
#define SUCCESS 0
#define ERROR_INVALID_INPUT 1
#define ERROR_ENCRYPTION_FAILED 2
#define ERROR_DECRYPTION_FAILED 3
#define ERROR_MEMORY_ALLOCATION 4

// Structure for encryption result
typedef struct {
    uint8_t* data;
    size_t length;
    int error_code;
} EncryptionResult;

// Global variables for WebAssembly memory management
static uint8_t* g_input_buffer = NULL;
static size_t g_input_buffer_size = 0;
static uint8_t* g_output_buffer = NULL;
static size_t g_output_buffer_size = 0;

// Memory management functions
EMSCRIPTEN_KEEPALIVE
int allocate_buffers(size_t input_size, size_t output_size) {
    // Free existing buffers
    if (g_input_buffer) {
        free(g_input_buffer);
        g_input_buffer = NULL;
    }
    if (g_output_buffer) {
        free(g_output_buffer);
        g_output_buffer = NULL;
    }

    // Allocate new buffers
    g_input_buffer = (uint8_t*)malloc(input_size);
    g_output_buffer = (uint8_t*)malloc(output_size);

    if (!g_input_buffer || !g_output_buffer) {
        // Cleanup on failure
        if (g_input_buffer) free(g_input_buffer);
        if (g_output_buffer) free(g_output_buffer);
        g_input_buffer = g_output_buffer = NULL;
        return ERROR_MEMORY_ALLOCATION;
    }

    g_input_buffer_size = input_size;
    g_output_buffer_size = output_size;
    return SUCCESS;
}

EMSCRIPTEN_KEEPALIVE
void cleanup_buffers() {
    if (g_input_buffer) {
        free(g_input_buffer);
        g_input_buffer = NULL;
    }
    if (g_output_buffer) {
        free(g_output_buffer);
        g_output_buffer = NULL;
    }
    g_input_buffer_size = g_output_buffer_size = 0;
}

// Simple XOR-based encryption for demonstration
// In production, this would use proper AES-GCM implementation
EMSCRIPTEN_KEEPALIVE
int encrypt_data(const uint8_t* input, size_t input_len,
                 const uint8_t* key, size_t key_len,
                 const uint8_t* iv, size_t iv_len) {

    if (!input || !key || !iv || input_len == 0 || key_len == 0 || iv_len == 0) {
        return ERROR_INVALID_INPUT;
    }

    if (!g_output_buffer || input_len + GCM_TAG_SIZE > g_output_buffer_size) {
        return ERROR_INVALID_INPUT;
    }

    // Simple XOR-based encryption for WASM demonstration
    // In production, replace with proper AES-GCM implementation
    for (size_t i = 0; i < input_len; i++) {
        g_output_buffer[i] = input[i] ^ key[i % key_len] ^ iv[i % iv_len];
    }

    // Add a simple tag (in real AES-GCM, this would be computed)
    uint32_t tag = 0xdeadbeef;
    memcpy(g_output_buffer + input_len, &tag, GCM_TAG_SIZE);

    return SUCCESS;
}

EMSCRIPTEN_KEEPALIVE
int decrypt_data(const uint8_t* input, size_t input_len,
                 const uint8_t* key, size_t key_len,
                 const uint8_t* iv, size_t iv_len) {

    if (!input || !key || !iv || input_len <= GCM_TAG_SIZE || key_len == 0 || iv_len == 0) {
        return ERROR_INVALID_INPUT;
    }

    if (!g_output_buffer || input_len - GCM_TAG_SIZE > g_output_buffer_size) {
        return ERROR_INVALID_INPUT;
    }

    // Verify tag (in real AES-GCM, this would be proper tag verification)
    uint32_t tag;
    memcpy(&tag, input + input_len - GCM_TAG_SIZE, GCM_TAG_SIZE);
    if (tag != 0xdeadbeef) {
        return ERROR_DECRYPTION_FAILED;
    }

    // Simple XOR-based decryption for WASM demonstration
    for (size_t i = 0; i < input_len - GCM_TAG_SIZE; i++) {
        g_output_buffer[i] = input[i] ^ key[i % key_len] ^ iv[i % iv_len];
    }

    return SUCCESS;
}

EMSCRIPTEN_KEEPALIVE
void* get_input_buffer() {
    return g_input_buffer;
}

EMSCRIPTEN_KEEPALIVE
void* get_output_buffer() {
    return g_output_buffer;
}

EMSCRIPTEN_KEEPALIVE
size_t get_input_buffer_size() {
    return g_input_buffer_size;
}

EMSCRIPTEN_KEEPALIVE
size_t get_output_buffer_size() {
    return g_output_buffer_size;
}

// Performance monitoring
EMSCRIPTEN_KEEPALIVE
uint64_t get_performance_counter() {
    // Return a timestamp for performance measurement
    // In a real implementation, this would use high-resolution timers
    return (uint64_t)emscripten_get_now();
}

// Utility function to zero out memory
EMSCRIPTEN_KEEPALIVE
void secure_zero_memory(void* ptr, size_t size) {
    if (ptr && size > 0) {
        volatile uint8_t* p = (volatile uint8_t*)ptr;
        for (size_t i = 0; i < size; i++) {
            p[i] = 0;
        }
    }
}

// Advanced encryption pipeline (placeholder for future implementation)
EMSCRIPTEN_KEEPALIVE
int encrypt_with_pbkdf2(const uint8_t* input, size_t input_len,
                        const char* password, size_t password_len,
                        const uint8_t* salt, size_t salt_len) {

    // This would implement PBKDF2 key derivation + AES-GCM encryption
    // For now, use simple approach as demonstration

    if (!input || !password || !salt ||
        input_len == 0 || password_len == 0 || salt_len == 0) {
        return ERROR_INVALID_INPUT;
    }

    // Generate a simple key from password (real implementation would use PBKDF2)
    uint8_t derived_key[AES_KEY_SIZE];
    for (int i = 0; i < AES_KEY_SIZE; i++) {
        derived_key[i] = password[i % password_len] ^ salt[i % salt_len];
    }

    // Generate simple IV (real implementation would use cryptographically secure IV)
    uint8_t iv[GCM_IV_SIZE];
    for (int i = 0; i < GCM_IV_SIZE; i++) {
        iv[i] = (input[i % input_len] ^ salt[i % salt_len]) ^ i;
    }

    return encrypt_data(input, input_len, derived_key, AES_KEY_SIZE, iv, GCM_IV_SIZE);
}