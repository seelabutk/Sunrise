#include <iostream>

#include "http/http.h"


int main() {
    std::cout << "Test Server" << std::endl;
    http::HTTPServer server = http::HTTPServer::create_new()
        .listen_on("0.0.0.0", 80)
        .set_num_workers(4)
        .run();

    return 0; 
}