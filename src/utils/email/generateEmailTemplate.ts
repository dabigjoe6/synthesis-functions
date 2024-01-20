import { ResourceI } from "../constants.js";
import { handleContentOrDescription } from "../preprocessing.js";
import moment from 'moment';
const generatePost = (post: ResourceI, isSummaryEnabled: boolean) => `
<table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:trebuchet ms,geneva;" align="left">
        <h4 class="v-text-align v-line-height" style="margin: 0px; line-height: 110%; text-align: left; word-wrap: break-word; font-weight: normal; font-family: 'Open Sans',sans-serif; font-size: 16px;"><strong>${post.title}</strong></h4>
      </td>
    </tr>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:trebuchet ms,geneva;" align="left">
        <p class="v-text-align v-line-height" style="margin: 0px; line-height: 110%; text-align: left; word-wrap: break-word; font-weight: normal; font-family: 'Open Sans',sans-serif; font-size: 16px; color: #747474;"><small>${post.authorsName ? post.authorsName : ""}${((post.authorsName && post.datePublished) || (post.authorsName && post.readLength)) ? " | " : ""}${post.datePublished ? moment(post.datePublished).format('D MMM, YYYY') : ""}${(post.datePublished && post.readLength) ? " | " : ""}${post.readLength ? post.readLength : ""}</small></p>
      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:trebuchet ms,geneva;" align="left">

        <div class="v-text-align v-line-height" style="color: #34495e; line-height: 120%; text-align: left; word-wrap: break-word;">
          <p style="font-size: 14px; line-height: 120%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 10; line-clamp: 10; -webkit-box-orient: vertical; max-height: 18em; line-height: 1.8em;">${isSummaryEnabled ? post?.summary
    ? post?.summary[0] === ":"
      ? "Summary" + post.summary
      : "Summary: " + post.summary
    : handleContentOrDescription(post.content || "", post.description || "")
    : handleContentOrDescription(post.content || "", post.description || "")}</p>
        </div>
      </td>
    </tr>
  </tbody>
</table>

<table id="u_content_text_2" style="font-family:trebuchet ms,geneva; margin-bottom: 15px;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 0px 0px 10px;font-family:trebuchet ms,geneva;" align="left">

        <div class="v-text-align v-line-height" style="line-height: 110%; text-align: left; word-wrap: break-word;">
          <p style="font-size: 14px; line-height: 110%;"><a rel="noopener" href="${post.url
  }" target="_blank">Read more ${post.source === "MEDIUM" ? "on Medium" : post.source === "SUBSTACK" ? "on Substack" : ""}</a></p>
        </div>

      </td>
    </tr>
  </tbody>
</table>`;

const generateEmailTemplate = (posts: ResourceI[], latestPosts: ResourceI[], isSummaryEnabled: boolean) => {
  if ((posts && posts.length > 0) || (latestPosts && latestPosts.length > 0)) {
    let postsHTML = "";
    let latestPostsHTML = "";

    latestPosts.forEach((post) => {
      latestPostsHTML += generatePost(post, isSummaryEnabled);
    });

    posts.forEach((post) => {
      postsHTML += generatePost(post, isSummaryEnabled);
    });

    return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    
    <head>
      <!--[if gte mso 9]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <!--[if !mso]><!-->
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--<![endif]-->
      <title></title>
    
      <style type="text/css">
        @media only screen and (min-width: 520px) {
          .u-row {
            width: 500px !important;
          }
          .u-row .u-col {
            vertical-align: top;
          }
          .u-row .u-col-100 {
            width: 500px !important;
          }
        }
        
        @media (max-width: 520px) {
          .u-row-container {
            max-width: 100% !important;
            padding-left: 0px !important;
            padding-right: 0px !important;
          }
          .u-row .u-col {
            min-width: 320px !important;
            max-width: 100% !important;
            display: block !important;
          }
          .u-row {
            width: 100% !important;
          }
          .u-col {
            width: 100% !important;
          }
          .u-col>div {
            margin: 0 auto;
          }
        }
        
        body {
          margin: 0;
          padding: 0;
        }
        
        table,
        tr,
        td {
          vertical-align: top;
          border-collapse: collapse;
        }
        
        p {
          margin: 0;
        }
        
        .ie-container table,
        .mso-container table {
          table-layout: fixed;
        }
        
        * {
          line-height: inherit;
        }
        
        a[x-apple-data-detectors='true'] {
          color: inherit !important;
          text-decoration: none !important;
        }
        
        table,
        td {
          color: #000000;
        }
        
        #u_body a {
          color: #0000ee;
          text-decoration: underline;
        }
        
        #u_content_text_2 a {
          color: #c2e2eb;
        }
        
        #u_content_text_6 a {
          color: #c2e2eb;
        }
        
        #u_content_heading_4 a {
          color: #34495e;
        }
        
        #u_content_heading_5 a {
          color: #34495e;
        }
        
        @media (max-width: 480px) {
          #u_content_text_2 .v-container-padding-padding {
            padding: 0px 10px 10px !important;
          }
          #u_content_text_2 .v-text-align {
            text-align: right !important;
          }
          #u_content_text_2 .v-line-height {
            line-height: 100% !important;
          }
          #u_content_text_6 .v-container-padding-padding {
            padding: 0px 10px 10px !important;
          }
          #u_content_text_6 .v-text-align {
            text-align: right !important;
          }
          #u_content_text_6 .v-line-height {
            line-height: 100% !important;
          }
        }
      </style>
    
    
    
      <!--[if !mso]><!-->
      <link href="https://fonts.googleapis.com/css?family=Cabin:400,700" rel="stylesheet" type="text/css">
      <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700" rel="stylesheet" type="text/css">
      <!--<![endif]-->
    
    </head>
    
    <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #ffffff;color: #000000">
      <!--[if IE]><div class="ie-container"><![endif]-->
      <!--[if mso]><div class="mso-container"><![endif]-->
      <table id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #ffffff;width:100%" cellpadding="0" cellspacing="0">
        <tbody>
          <tr style="vertical-align: top">
            <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
              <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #ffffff;"><![endif]-->
    
    
              <div class="u-row-container" style="padding: 0px;background-color: transparent">
                <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                  <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                    <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:500px;"><tr style="background-color: transparent;"><![endif]-->
    
                    <!--[if (mso)|(IE)]><td align="center" width="500" style="width: 500px;padding: 0px 0px 450px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                    <div class="u-col u-col-100" style="max-width: 320px;min-width: 500px;display: table-cell;vertical-align: top;">
                      <div style="height: 100%;width: 100% !important;">
                        <!--[if (!mso)&(!IE)]><!-->
                        <div style="height: fit-content; padding-bottom: 30px; border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;">
                          <!--<![endif]-->
    
                          <table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                      <td class="v-text-align" style="padding-right: 0px;padding-left: 0px;" align="center">
                                        <a href="https://synthesisapp.com" target="_blank">
                                          <img align="center" border="0" src="https://res.cloudinary.com/dflm5nz9p/image/upload/v1686783702/SYNTHESIS-removebg-preview_copy-removebg-preview_n9xqgt.jpg" alt="" title="" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 27%;max-width: 129.6px;"
                                            width="129.6" />
                                        </a>
                                      </td>
                                    </tr>
                                  </table>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>
    
                          <table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 20px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <h1 class="v-text-align v-line-height" style="margin: 0px; line-height: 100%; text-align: left; word-wrap: break-word; font-weight: normal; font-family: 'Cabin',sans-serif; font-size: 19px;"><strong>Today's digest</strong></h1>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>
    
                          ${latestPosts.length
        ? `<table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 0px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <div class="v-text-align v-line-height" style="line-height: 140%; text-align: left; word-wrap: break-word;">
                                    <p style="font-size: 14px; line-height: 140%;"><strong>What's New</strong></p>
                                  </div>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
      <tbody>
        <tr>
          <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:trebuchet ms,geneva;" align="left">

            <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
              <tbody>
                <tr style="vertical-align: top">
                  <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <span>&#160;</span>
                  </td>
                </tr>
              </tbody>
            </table>

          </td>
        </tr>
      </tbody>
    </table>`
        : ``
      }
    
                          ${latestPostsHTML}
    
                          ${posts.length
        ? `<table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:25px 10px 0px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <div class="v-text-align v-line-height" style="line-height: 140%; text-align: left; word-wrap: break-word;">
                                    <p style="font-size: 14px; line-height: 140%;"><strong>In case you missed it</strong></p>
                                  </div>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>
    
                          <table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                                    <tbody>
                                      <tr style="vertical-align: top">
                                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                                          <span>&#160;</span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>`
        : ``
      }
    
                          ${postsHTML}
    
                          <!--[if (!mso)&(!IE)]><!-->
                        </div>
                        <!--<![endif]-->
                      </div>
                    </div>
                    <!--[if (mso)|(IE)]></td><![endif]-->
                    <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                  </div>
                </div>
              </div>
          
    
                          <table id="u_content_heading_4" style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <h1 class="v-text-align v-line-height" style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-weight: normal; font-size: 9px;"><a rel="noopener" href="https://synthesisapp.com" target="_blank">Too many emails? Change email frequency</a></h1>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>
    
                          <table id="u_content_heading_5" style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <h1 class="v-text-align v-line-height" style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-weight: normal; font-size: 9px;"><a rel="noopener" href="https://www.linkedin.com/in/joseph-olabisi/" target="_blank">Developed by Joseph Olabisi</a></h1>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>
    
                          <table style="font-family:trebuchet ms,geneva;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                            <tbody>
                              <tr>
                                <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:trebuchet ms,geneva;" align="left">
    
                                  <h1 class="v-text-align v-line-height" style="margin: 0px; color: #66ced6; line-height: 140%; text-align: center; word-wrap: break-word; font-weight: normal; font-size: 10px;">
                                    <p><em>Copyright © 2023 Synthesis</em><br /><em>All rights reserved.</em></p>
                                  </h1>
    
                                </td>
                              </tr>
                            </tbody>
                          </table>
    
                        
    
              <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
            </td>
          </tr>
        </tbody>
      </table>
      <!--[if mso]></div><![endif]-->
      <!--[if IE]></div><![endif]-->
    </body>
    
    </html>`;
  } else {
    return "";
  }
};

export default generateEmailTemplate;
