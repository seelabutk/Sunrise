#include <iostream>
#include <optional>
#include <functional>

#include "http/http.h"

class TestController : public http::HTTPController {
public:
    void test_override() override {
        printf("TEST CONTROLLER\n");
    }
private:
};

int main() {
    std::optional<http::HTTPServer> server = 
        http::HTTPServer::create_new()
        .listen_on("0.0.0.0", 8080)
        .set_num_workers(4)
        .register_controller(
            http::HTTPController::create_new<TestController>("test/route")
        )
        .run();

    return 0; 
}
