#include <iostream>
#include <optional>

#include "http/http.h"


int main() {
    std::cout << "Test Server" << std::endl;
    std::optional<http::HTTPServer> server = 
        http::HTTPServer::create_new()
        .listen_on("0.0.0.0", 8080)
        .set_num_workers(4)
        .run();

    return 0; 
}