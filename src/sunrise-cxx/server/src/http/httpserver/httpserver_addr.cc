#include "defines.h"
#include "httpserver.h"
#include "http/request.h"
#include "http/response.h"

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

void* get_ip_type(struct sockaddr* sa) {
    if (sa->sa_family == AF_INET) {
        return &(((struct sockaddr_in*)sa)->sin_addr);
    }

    return &(((struct sockaddr_in6*)sa)->sin6_addr);
}

void HTTPServer::serve(i32 sockfd) {
    int new_fd;
    char s[INET6_ADDRSTRLEN];
    struct sockaddr_storage their_addr;
    socklen_t sin_size;

    sin_size = sizeof(their_addr);
    while(true) {
        new_fd = accept(sockfd, (struct sockaddr*)&their_addr, &sin_size);
        if (new_fd == -1) {
            std::fprintf(stderr, "ERROR: accept()\n");
            continue;
        }

        // Get the presentation form of the client IP
        inet_ntop(
            their_addr.ss_family,
            get_ip_type((struct sockaddr*)&their_addr),
            s,
            sizeof(s)     
        );
        log(LOG_LEVEL_TRACE, "%s got connection from %s", m_ipaddr, s);

        // TODO: Handle the connection
        // TODO: pull this into thread pool
        std::vector<char> request = receive_request(new_fd);
        log(LOG_LEVEL_DEBUG, "Request |%s|\n", request.data());

        // TODO: Parse the request and get the path from it and 
        // use a user-created controller to handle the request
        (void)process_request(m_socket_listen, new_fd, request);
    }
}

std::vector<char> HTTPServer::receive_request(i32 fd) {
    constexpr u32 bufsize = 2048;
    // std::vector<char> buffer;
    char buffer[bufsize];
    u32 bytes_read = 0,
        total = 0;

    // buffer.reserve(bufsize);

    // Read from the file descriptor until all data has been read
    // while(bytes_read = recv(fd, buffer.data()+total, bufsize, 0), bytes_read == bufsize) {
    while(bytes_read = recv(fd, buffer+total, bufsize, 0), bytes_read == bufsize) {
        total += bytes_read;
        
    }

    std::vector<char> reqbuf(bufsize);
    std::strcpy(reqbuf.data(), buffer);
    // return buffer;
    return reqbuf;
}


void HTTPServer::process_request(i32 socket_fd, i32 connection_fd, std::vector<char>& request) {
    // HTTPRequest req = HTTPRequest::create_new(request);
    HTTPResponse res = HTTPResponse::create_new();

    if (request.size() == 0) {
        log(LOG_LEVEL_WARN, "Empty Request");
        // TODO: handle empty requests
        return;
    }

    res.set_status(status::OK);
}

} // http
