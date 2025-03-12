import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly firebaseFunctionUrl = 'https://us-central1-hungr-firebase.cloudfunctions.net/sendBrevoEmail'; // Replace with actual URL

  constructor(private readonly http: HttpClient) {}

  sendConfirmationEmail(email: string, confirmationLink: string, name: string) {
    
    return this.http.post(this.firebaseFunctionUrl, {
      email,
      subject: "Confirm Your Email",
      message: `<html>

<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
        rel="stylesheet">
</head>

<body>
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;" width="600"
        align="center">
        <tr>
            <td style="height:15px;"></td>
        </tr>
        <tr>
            <td>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;"
                    width="600" align="center">
                    <tr>
                        <td style="width: 30px;"></td>
                        <td style="text-align: left;">
                            <a href="" target="_blank"><img src="https://anomalytest.co.za/hungr/resetpassword/logo.png"
                                    alt="" width="102" style="width: 102px;" /></a>
                        </td>
                        <td style="text-align: right;">
                            <a href="" target="_blank"
                                style="color: #444444;font-family: 'Barlow', sans-serif;font-weight: 500; font-size: 12px;line-height: 12px; margin: 0; ">View
                                in browser</a>
                        </td>
                        <td style="width: 30px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="height:15px;"></td>
        </tr>
        <tr>
            <td>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;"
                    width="600" align="center">
                    <tr>
                        <td style="width: 30px;"></td>
                        <td>
                            <img src="https://anomalytest.co.za/hungr/confirm/header1.png" alt="" width="540"
                                style="width: 540px;" />
                        </td>
                        <td style="width: 30px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="height:40px;"></td>
        </tr>
        <tr>
            <td>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;"
                    width="600" align="center">
                    <tr>
                        <td style="width: 100px;"></td>
                        <td>
                            <p
                                style="text-align:center;color: #444444;font-family: 'Barlow', sans-serif;font-weight: 500; font-size: 14px;line-height: 12px; margin: 0; ">
                                Hi ${name}<br /><br /><br />
                                Thank you for signing up for HUNGR.<br /><br /><br />
                                <b>Please verify your email address</b> by clicking on the button below.
                            </p>
                        </td>
                        <td style="width: 100px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="height:30px;"></td>
        </tr>
        <tr>
            <td style="text-align: center;">
                <a href="${confirmationLink}" target="_blank"> <img src="https://anomalytest.co.za/hungr/confirm/button1.png"
                        alt="" width="150" style="width: 150px;" /></a>
            </td>
        </tr>
        <tr>
            <td style="height:30px;"></td>
        </tr>
        <tr>
            <td>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;"
                    width="600" align="center">
                    <tr>
                        <td style="width: 100px;"></td>
                        <td>
                            <p
                                style="text-align:center;color: #444444;font-family: 'Barlow', sans-serif;font-weight: 500; font-size: 14px;line-height: 16px; margin: 0; ">
                                If you didn't ask to verify this address, you can ignore this email.
                            </p>
                        </td>
                        <td style="width: 100px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="height:45px;"></td>
        </tr>
        <tr>
            <td>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;"
                    width="600" align="center">
                    <tr>
                        <td style="width: 130px;"></td>
                        <td>
                            <p
                                style="text-align:center;color: #444444;font-family: 'Barlow', sans-serif;font-weight: 500; font-size: 14px;line-height: 16px; margin: 0; ">
                                Thanks,<br /><br /><br />
                                The Hungr Team
                            </p>
                        </td>
                        <td style="width: 130px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="height:40px;"></td>
        </tr>
        <tr>
            <td style="background-color: rgba(242, 243, 244, 1);">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;"
                    width="600" align="center">
                    <tr>
                        <td style="height:30px;"></td>
                    </tr>
                    <tr>
                        <td>
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation"
                                style="vertical-align:middle;" align="center">
                                <tr>
                                    <td style="width: 266px;"></td>
                                    <td><a href="" target="_blank"><img
                                                src="https://anomalytest.co.za/hungr/resetpassword/insta.png" alt=""
                                                width="15" style="width: 15px;" /></a></td>
                                    <td style="width: 15px;"></td>
                                    <td><a href="" target="_blank"><img
                                                src="https://anomalytest.co.za/hungr/resetpassword/fb.png" alt=""
                                                width="7" style="width: 7px;" /></a></td>
                                    <td style="width: 15px;"></td>
                                    <td><a href="" target="_blank"><img
                                                src="https://anomalytest.co.za/hungr/resetpassword/web.png" alt=""
                                                width="15" style="width: 15px;" /></a></td>
                                    <td style="width: 266px;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:30px;"></td>
                    </tr>
                    <tr>
                        <td style="text-align: center;">
                            <a href="" target="_blank"
                                style="color: #444444;font-family: 'Barlow', sans-serif;font-weight: 500; font-size: 12px;line-height: 12px; margin: 0; ">Need
                                help? Get in touch</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:30px;"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>`,
    });
  }
}
