#include "route.h"

#include <iostream>

namespace http {

/// @brief Copy constructor
/// @param r route to copy
Route::Route(const Route& r) {
    path = r.path;
    url = r.url;
    path_regex = r.path_regex;
    pairs = r.pairs;
}

Route Route::from(std::string url) {
    Route r;
    r.url = url;
    r.path_regex = std::regex(r.path_pattern);

    r.pairs.clear();

    // Get all keys from the URL path
     std::sregex_token_iterator
         i(url.begin(), url.end(), r.path_regex),  
         iend;

     while (i != iend) {
         std::string key = *i++;
         if (key.length() > 1) 
             r.path.keys.push_back(key); 
     }

    // std::cout << "ROUTE\nPATHNUM: " << r.path.keys.size() << std::endl;
    // std::cout << "URL " + r.url << std::endl << "PATH: ";
    // for (int x = 0; x < r.path.keys.size(); x++) {
    //     std::cout << r.path.keys[x] + "/";
    // }
    // std::cout << std::endl;

    return r;
}

// bool Route::test(const std::string& tmpl) {
//     return false;
// }

// std::optional<std::string> Route::match(const std::string& key) {
//     return std::nullopt;
// }

}
