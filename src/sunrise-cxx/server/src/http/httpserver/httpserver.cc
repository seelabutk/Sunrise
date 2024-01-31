#include "defines.h"
#include "httpserver.h"
#include "httpserver_logger.h"

#include <cstdlib>
#include <string.h>

namespace http {

/// @brief HTTPServer constructor
HTTPServer::HTTPServer() {

}

/// @brief HTTPServer destructor
HTTPServer::~HTTPServer() {
}

/// @brief create a new HTTPServer with default values
/// @return the created server
HTTPServer HTTPServer::create_new() {
    HTTPServer server {};
    server.m_ipaddr = nullptr;
    server.m_port = 80; // default to port 80 if none other is specified later
    server.m_socket_listen = 0;
    server.m_num_threads = 1; //default to 1 thread if none other is specified later
    server.m_enable_logging = true;
    server.m_log_path = nullptr;

    return server;
}

/// @brief  Set whether or not the server is going to log
/// @param enable true/false value that determines if its going to log
/// @return the server itself
HTTPServer HTTPServer::enable_logging(const bool enable) {
    m_enable_logging = enable;
    
    return *this;
}

/// @brief set the log path for server to write to
/// @param log_file_path // the path to the desired log file
/// @return // the server itself
HTTPServer HTTPServer::set_log_file(const char* log_file_path) {
    m_log_path = log_file_path;

    return *this;
}

/// @brief set the ip address and port for the server to listen on
/// @param ip   // the ip address
/// @param port // the port
/// @return // the server itself
HTTPServer HTTPServer::listen_on(const char* ip, u32 port) {
    m_ipaddr = ip;
    m_port = port;
    
    return *this;
}

/// @brief set the number of worker threads the server will use to handle connections
/// @param num_threads the number of worker threads desired
/// @return the server itself
HTTPServer HTTPServer::set_num_workers(const u32 num_threads) {
    m_num_threads = num_threads;
    
    return *this;
}

/// @brief The runtime logic for the server
/// @return the server itself
HTTPServer HTTPServer::run() {
    // printf("Server listening on %s:%u\n", m_ipaddr, m_port);
    this->log(LOG_LEVEL_DEBUG, "Listening on %s:%u", m_ipaddr, m_port);
    while (true) {
        // TODO: Server logic to run goes here
    }
}

} // http