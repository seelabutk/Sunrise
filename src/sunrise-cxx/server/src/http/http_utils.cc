#include "http_defines.h"

namespace http
{

    #define MAKE_STATUS_STR(code)\
        constexpr u64 BUFSIZE = 100;\
        std::vector<char> code_str(BUFSIZE);\
        const char* codebuf = #code;\
        std::strcpy(code_str.data(), codebuf);\
        return code_str;

    std::vector<char> status_to_str(status::response_status_code_e code) {
        std::vector<char> rv;
        switch(code) {
            case status::Continue: {
                MAKE_STATUS_STR(Continue);
            } break;
            case status::SwitchingProtocols: {
                MAKE_STATUS_STR(SwitchingProtocols);
            } break;
            case status::Processing: {
                MAKE_STATUS_STR(Processing);
            } break;
            case status::EarlyHints: {
                MAKE_STATUS_STR(EarlyHints);
            } break;
            case status::OK: {
                MAKE_STATUS_STR(OK);
            } break;
            case status::Created: {
                MAKE_STATUS_STR(Created);
            } break;
            case status::Accepted: {
                MAKE_STATUS_STR(Accepted);
            } break;
            case status::NonAuthorativeInformation: {
                MAKE_STATUS_STR(NonAuthorativeInformation);
            } break;
            case status::NoContent: {
                MAKE_STATUS_STR(NoContent);
            } break;
            case status::ResetContent: {
                MAKE_STATUS_STR(ResetContent);
            } break;
            case status::PartialContent: {
                MAKE_STATUS_STR(PartialContent);
            } break;
            case status::MultiStatus: {
                MAKE_STATUS_STR(MultiStatus);
            } break;
            case status::AlreadyReported: {
                MAKE_STATUS_STR(AlreadyReported);
            } break;
            case status::IMUsed: {
                MAKE_STATUS_STR(IMUsed);
            } break;
            case status::MultipleChoices: {
                MAKE_STATUS_STR(MultipleChoices);
            } break;
            case status::MovedPermanently: {
                MAKE_STATUS_STR(case );
            } break;
            case status::Found: {
                MAKE_STATUS_STR(Found);
            } break;
            case status::SeeOther: {
                MAKE_STATUS_STR(SeeOther);
            } break;
            case status::NotModified: {
                MAKE_STATUS_STR(NotModified);
            } break;
            case status::UseProxy: {
                MAKE_STATUS_STR(UseProxy);
            } break;
            case status::SwitchProxy: {
                MAKE_STATUS_STR(SwitchProxy);
            } break;
            case status::TemporaryRedirect: {
                MAKE_STATUS_STR(TemporaryRedirect);
            } break;
            case status::PermanentRedirect: {
                MAKE_STATUS_STR(PermanentRedirect);
            } break;
            case status::BadRequest: {
                MAKE_STATUS_STR(BadRequest);
            } break;
            case status::Unauthorized: {
                MAKE_STATUS_STR(Unauthorized);
            } break;
            case status::PaymentRequired: {
                MAKE_STATUS_STR(PaymentRequired);
            } break;
            case status::Forbidden: {
                MAKE_STATUS_STR(Forbidden);
            } break;
            case status::NotFound: {
                MAKE_STATUS_STR(NotFound);
            } break;
            case status::MethodNotAllowed: {
                MAKE_STATUS_STR(MethodNotAllowed);
            } break;
            case status::NotAcceptable: {
                MAKE_STATUS_STR(NotAcceptable);
            } break;
            case status::ProxyAuthenticationRequired: {
                MAKE_STATUS_STR(ProxyAuthenticationRequired);
            } break;
            case status::RequestTimeout: {
                MAKE_STATUS_STR(RequestTimeout);
            } break;
            case status::Conflict: {
                MAKE_STATUS_STR(Conflict);
            } break;
            case status::Gone: {
                MAKE_STATUS_STR(Gone);
            } break;
            case status::LengthRequired: {
                MAKE_STATUS_STR(LengthRequired);
            } break;
            case status::PreconditionFailed: {
                MAKE_STATUS_STR(PreconditionFailed);
            } break;
            case status::PayloadTooLarge: {
                MAKE_STATUS_STR(PayloadTooLarge);
            } break;
            case status::URITooLong: {
                MAKE_STATUS_STR(URITooLong);
            } break;
            case status::UnsupportedMediaType: {
                MAKE_STATUS_STR(UnsupportedMediaType);
            } break;
            case status::RangeNotSatisfiable: {
                MAKE_STATUS_STR(RangeNotSatisfiable);
            } break;
            case status::ExpectationFailed: {
                MAKE_STATUS_STR(ExpectationFailed);
            } break;
            case status::ImATeapot: {
                MAKE_STATUS_STR(ImATeapot);
            } break;
            case status::MisdirectedRequest: {
                MAKE_STATUS_STR(MisdirectedRequest);
            } break;
            case status::UnprocessableContent: {
                MAKE_STATUS_STR(UnprocessableContent);
            } break;
            case status::Locked: {
                MAKE_STATUS_STR(Locked);
            } break;
            case status::FailedDependency: {
                MAKE_STATUS_STR(FailedDependency);
            } break;
            case status::TooEarly: {
                MAKE_STATUS_STR(TooEarly);
            } break;
            case status::UpgradeRequired: {
                MAKE_STATUS_STR(UpgradeRequired);
            } break;
            case status::PreconditionRequired: {
                MAKE_STATUS_STR(PreconditionRequired);
            } break;
            case status::TooManyRequests: {
                MAKE_STATUS_STR(TooManyRequests);
            } break;
            case status::RequestHandlerFieldsTooLarge: {
                MAKE_STATUS_STR(RequestHandlerFieldsTooLarge);
            } break;
            case status::UnavailableForLegalReasons: {
                MAKE_STATUS_STR(UnavailableForLegalReasons);
            } break;

            case status::InternalServerError: {
                MAKE_STATUS_STR(InternalServerError);
            } break;
            case status::NotImplimented: {
                MAKE_STATUS_STR(NotImplimented);
            } break;
            case status::BadGateway: {
                MAKE_STATUS_STR(BadGateway);
            } break;
            case status::ServiceUnavailable: {
                MAKE_STATUS_STR(ServiceUnavailable);
            } break;
            case status::GatewayTimeout: {
                MAKE_STATUS_STR(GatewayTimeout);
            } break;
            case status::HTTPVersionNotSupported: {
                MAKE_STATUS_STR(HTTPVersionNotSupported);
            } break;
            case status::VariantAlsoNegotiates: {
                MAKE_STATUS_STR(VariantAlsoNegotiates);
            } break;
            case status::InsufficientStorage: {
                MAKE_STATUS_STR(InsufficientStorage);
            } break;
            case status::LoopDetected: {
                MAKE_STATUS_STR(LoopDetected);
            } break;
            case status::NotExtended: {
                MAKE_STATUS_STR(NotExtended);
            } break;
            case status::NetworkAuthenticationRequired: {
                MAKE_STATUS_STR(NetworkAuthenticationRequired);
            } break;
        }

        // NOTE: If we get here, something has gone wrong
        return rv;
    }

} // namespace http