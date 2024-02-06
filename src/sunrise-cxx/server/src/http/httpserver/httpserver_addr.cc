#include "defines.h"
#include "httpserver.h"

// LINUX INCLUDES
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>
#include <sys/wait.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <bits/stdc++.h>

namespace http {

/// @brief Get the socket file descriptor that we want the server to listen to
/// @return the successful socket file descriptor
int HTTPServer::bind_to_addr() {
    i32 error;
    struct addrinfo hints;
    char port_buf[50];

    // Create a server address
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = m_stream_protocol == protocol::STREAM_TCP ? SOCK_STREAM : SOCK_DGRAM;
    hints.ai_flags = AI_PASSIVE;

    snprintf(port_buf, sizeof(port_buf), "%u", m_port);
    if ((error = getaddrinfo(nullptr, port_buf, &hints, &m_serverinfo)) != 0) {
        log(LOG_LEVEL_ERROR, "getaddrinfo: %s", gai_strerror(error));
        return false;
    }

    // Bind the server info
    int yes = 1, socket_fd;

    // Loop through all the results and bind to the first one we can
    struct addrinfo* p;
    for (p = m_serverinfo; p != nullptr; p = p->ai_next) {
        // Create a socket from the address
        if ((socket_fd = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1) {
            log(LOG_LEVEL_WARN, "server: (socket)");
            continue;
        }

        // Allow reuse of the socket
        if (setsockopt(socket_fd, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(int)) == -1) {
            log(LOG_LEVEL_FATAL, "server: (setsockopt)");
            return -1;
        }

        // Attempt to bind and break loop if we can
        if (bind(socket_fd, p->ai_addr, p->ai_addrlen) == -1) {
            close(socket_fd);
            log(LOG_LEVEL_WARN, "server: (bind)");
            continue;
        }

        log(LOG_LEVEL_DEBUG, "Successfully bound to address");
        break;
    }

    return socket_fd;
}

/// @brief Listen on the socket file descriptor that we have bound to before
/// @return whether the listen call is successfull or not
bool HTTPServer::listen_on() {
    // log(LOG_LEVEL_TRACE, "LISTEN: %d", m_socket_listen);
    if (listen(m_socket_listen, static_cast<int>(20)) == -1) {
        log(LOG_LEVEL_FATAL, "server (listen)");
        return false;
    }

    log(LOG_LEVEL_DEBUG, "Listening on  port %u",  m_port);
    return true;
}

} // http
