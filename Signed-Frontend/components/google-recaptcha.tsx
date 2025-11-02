import { useMemo, useRef } from "react";
import { ActivityIndicator, Modal, View } from "react-native";
import { WebView } from "react-native-webview";

type Props = {
    siteKey: string; // use Google test key in dev
    onToken: (t: string) => void; // called with captcha token
    onError?: (msg: string) => void;
    visible: boolean;
    onClose: () => void;
    domain?: string; // o(ptional) default google.com
};

export default function GoogleReCaptcha({
    siteKey,
    onToken,
    onError,
    visible,
    onClose,
    domain = "www.google.com",
}: Props) {
    const webRef = useRef<WebView>(null);

  // Inline HTML that renders an invisible v2 and posts the token back
    const html = useMemo(
    () => `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <script src="https://${domain}/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script>
    <script>
      function send(msg){ window.ReactNativeWebView.postMessage(msg); }
      function onloadCallback(){
        var widgetId = grecaptcha.render('recaptcha', {
          'sitekey': '${siteKey}',
          'size': 'invisible',
          'callback': function(token){ send(JSON.stringify({type:'success', token: token})); },
          'error-callback': function(){ send(JSON.stringify({type:'error'})); },
          'expired-callback': function(){ send(JSON.stringify({type:'expired'})); }
        });
        grecaptcha.execute(widgetId);
      }
    </script>
    <style>html,body,#recaptcha{height:100%;margin:0;}</style>
  </head>
  <body>
    <div id="recaptcha"></div>
  </body>
</html>`, [domain, siteKey]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
            <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html }}
            onMessage={(e) => {
                try {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.type === "success" && msg.token) { onToken(msg.token); onClose(); }
                else if (msg.type === "expired") { onError?.("reCAPTCHA expired"); onClose(); }
                else if (msg.type === "error") { onError?.("reCAPTCHA error"); onClose(); }
                } catch {
                onError?.("Invalid reCAPTCHA response");
                onClose();
                }
            }}
            startInLoadingState
            renderLoading={() => (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator />
                </View>
            )}
            />
        </View>
        </Modal>
    );
}