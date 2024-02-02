#pragma once
#include "defines.h"
#include "http/http_defines.h"
#include "httpserver_logger.h"

#include <optional>
#include <string>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>
#include <signal.h>
#include <errno.h>
#include <sys/wait.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <bits/stdc++.h>

namespace http {

class HTTPServer {
public:
    HTTPServer();
    ~HTTPServer();
    
    static HTTPServer create_new();

    void print_self();
    
    std::optional<HTTPServer> run();             // Run the server
    HTTPServer set_log_file(const char* log_file_path);
    HTTPServer enable_logging(const bool enable); // set whether the server will log or not
    HTTPServer listen_on(const char* ip, u32 port); // set the port the server will listen on
    HTTPServer set_num_workers(const u32 num_threads); // set the number of threads 
    HTTPServer set_stream_protocol(stream_protocol_e prot); // set whether we want TCP or UDP

private:
    void log(log_level level, const char* message, ...);
    int bind_to_addr();
    bool listen_on();
   
    const char* m_ipaddr;                // The IP address for the server
    u32 m_port;                          // The port for the server
    int m_socket_listen;                 // The socket the server will hold the connection on
    i32 m_backlog;                       // The backlog of connections for the server
    u32 m_num_threads;                   // Number of thread workers for the process
    bool m_enable_logging;               // Whether the server is going to log
    const char* m_log_path;              // The path to the file where things will log
    stream_protocol_e m_stream_protocol; // whether we want to use TCP or UDP
    struct addrinfo* m_serverinfo;               // the server info struct for the server
};

}