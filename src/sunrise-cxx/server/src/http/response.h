#pragma once
#include "defines.h"
#include "http_defines.h"

#include <cstring>
#include <cstdio>
#include <vector>

namespace http 
{

struct ResponseHeader {
    std::vector<char> status;
    std::vector<char> content_length;
    std::vector<char> content_type;
};

struct ResponseBody {
    std::vector<char> data;
    std::size_t data_size;
};


class HTTPResponse {
public:
    static HTTPResponse create_new();

    void set_status(status::response_status_code_e status_code) {
        m_headers.status = status_to_str(status_code);
        printf("STATUS: %s\n", m_headers.status.data());
    }

private:
    ResponseHeader m_headers;
    ResponseBody m_body;
    std::size_t m_data_size;
};

}