#include "httpserver.h"
#include "httpserver_logger.h"
#include "defines.h"

#include <stdarg.h>
#include <string.h>

namespace http {

void HTTPServer::log(log_level level, const char* message, ...) {
    if (!m_enable_logging) return;

    va_list args;
    va_start(args, message);

    // TODO: Use platform-specific printing. For now we can assume Linux
   const char* level_strings[6] = {
        "[FATAL]",
        "[ERROR]",
        "[WARN]",
        "[INFO]",
        "[DEBUG]",
        "[TRACE]",
    };

    // LINUX ONLY COLOR VALUES
    const char* color_strings[] = {
        "0;41",
        "1;31",
        "1;33",
        "1;32",
        "1;34",
        "1;37"
    };

    bool is_error = level > LOG_LEVEL_WARN;

    // Massive buffer to avoid runtime allcoations that are slow
    constexpr size_t message_length = 32000;
    char error_message[message_length];

    // Format the message
    vsnprintf(error_message, message_length+1, message, args);

    va_end(args);

    // Prepend the error message level to the message string
    // NOTE: If this is ported to Windows, the way color values
    //       are displayed should be changed
    char out_message[message_length];
    snprintf(
        out_message, 
        sizeof(out_message) + strlen(level_strings[level]) + strlen(color_strings[level]), 
        "\x1b[%sm%s%s\x1b[0m\n", 
        color_strings[level],
        level_strings[level], 
        error_message
    );

    // TODO: Use log file path if set
    // fprintf(stdout, "%s", out_message);
    printf("%s", out_message);
    
    return;
}

}