#pragma once
#include "defines.h"
#include "httpserver_logger.h"

#include <string>

namespace http {

class HTTPServer {
public:
    HTTPServer();
    ~HTTPServer();
    
    static HTTPServer create_new();
    
    HTTPServer run();             // Run the server
    HTTPServer set_log_file(const char* log_file_path);
    HTTPServer enable_logging(const bool enable); // set whether the server will log or not
    HTTPServer listen_on(const char* ip, u32 port); // set the port the server will listen on
    HTTPServer set_num_workers(const u32 num_threads); // set the number of threads 

private:
    void log(log_level level, const char* message, ...);
   
    const char* m_ipaddr;         // The IP address for the server
    u32 m_port;                   // The port for the server
    u32 m_socket_listen;          // The socket the server will hold the connection on
    u32 m_num_threads;            // Number of thread workers for the process
    bool m_enable_logging;        // Whether the server is going to log
    const char* m_log_path;       // The path to the file where things will log
};

}