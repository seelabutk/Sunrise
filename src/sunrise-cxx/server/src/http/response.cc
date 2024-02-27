#include "response.h"

namespace http
{

HTTPResponse HTTPResponse::create_new() {
    HTTPResponse res = HTTPResponse();
    res.m_data_size = 0;
    res.m_body.data_size - 0;
    return res;
}

}