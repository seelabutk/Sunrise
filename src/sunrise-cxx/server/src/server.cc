#include <iostream>
#include <optional>
#include <functional>

#include "http/controller.h"
#include "http/http.h"

class TestController : public http::HTTPController<TestController> {
public:
    HTTP_METHOD_LIST_BEGIN
    HTTP_METHOD_ADD(TestController::test_method, "/test");

    HTTP_METHOD_LIST_END

private:
    void test_method() {}
};

int main() {
    std::optional<http::HTTPServer> server = 
        http::HTTPServer::create_new()
        .listen_on("0.0.0.0", 8080)
        .set_num_workers(4)
        .register_route_controller<TestController>(
            TestController::create_new()
        )
        .run();

    return 0; 
}