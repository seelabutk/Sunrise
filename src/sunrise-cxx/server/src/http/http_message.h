#pragma once
#include "defines.h"
#include "http_defines.h"

#include <vector>
#include <string>

namespace http
{

class HTTPMessage {
public:
    HTTPMessage();

    void add_header(const std::string& key, const std::string& value);
    void set_version(u32 major, u32 minor);

    const std::string get_version() const;
    std::vector<char> get_body() const;
    std::string get_header_value(const std::string& key) const;

    


protected:
};

}