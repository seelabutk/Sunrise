#pragma once
#include "defines.h"
#include "http_defines.h"

#include <vector>
#include <string>
#include <map>
#include <regex>
#include <optional>

namespace http {

/// @brief Holds the information for a path from a route
struct Path {
    std::vector<std::string> keys;
    std::regex re;
};

// Callback function when a request route is matched
template <typename... T>
using route_callback = std::function<void(T...)>;

class Route {
    public:
        Route() {}
        ~Route() {};
        Route(const Route& r);

        static Route from(std::string url);

        Path path;
        std::string url;
        std::regex path_regex;

        const std::string capture_pattern = R"(?:([^\\/]+?))";

        // const std::string path_pattern = "([^\\/]+)?";
        const std::string path_pattern = R"(([^\/]+)?)";

        std::map<std::string, std::string> pairs;
        // std::optional<std::string> match(const std::string& key);
        // bool test(const std::string& tmpl);

};

}
