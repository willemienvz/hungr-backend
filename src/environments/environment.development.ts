export const environment = {
    menuUrl: 'http://localhost:5174/menu/',
    production: false,
    firebase: {
        apiKey: 'AIzaSyBVj2pm0X0eCulSfAF7WYC_EFEJNK7_35M',
        authDomain: 'hungr-firebase.firebaseapp.com',
        databaseURL: 'https://hungr-firebase-default-rtdb.firebaseio.com',
        projectId: 'hungr-firebase',
        storageBucket: 'hungr-firebase.appspot.com',
        messagingSenderId: '237830808755',
        appId: '1:237830808755:web:061c222e81fbbd8991fcc6',
        measurementId: 'G-2KDPVEL6L9'
    },
    contentful: {
        spaceId: '',
        accessToken: '',
        environment: 'master', 
      },
      yoko:{
        publicKey: '',
      },
      payfast: {
        merchantId: '10013557',
        merchantKey: 'nn7rftlml9ki3',
        passphrase: 'T3st1ngT3st1ng',
        sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
        productionUrl: 'https://www.payfast.co.za/eng/process',
        itnUrl: 'https://us-central1-hungr-firebase.cloudfunctions.net/payfastItn',
        returnUrl: 'http://localhost:4200/verify-email-address',
        cancelUrl: 'http://localhost:4200/payment-cancel',
        notifyUrl: 'https://us-central1-hungr-firebase.cloudfunctions.net/payfastItn'
      }
  };