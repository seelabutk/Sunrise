#include <iostream>
#include <optional>
#include <functional>

#include "http/http.h"

void test_callback() {
    std::printf("CALLBACK\n");
}

int main() {
    std::optional<http::HTTPServer> server = 
        http::HTTPServer::create_new()
        .listen_on("0.0.0.0", 8080)
        .set_num_workers(4)
        .register_handler("test/route", test_callback)
        .run();

    return 0; 
}
