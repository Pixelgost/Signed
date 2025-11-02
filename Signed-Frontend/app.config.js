import 'dotenv/config';

export default {
  expo: {
    name: "Signed-Frontend",
    slug: "Signed-Frontend",
    extra: {
      MACHINE_IP: process.env.MACHINE_IP,
      RECAPTCHA_SITE_KEY: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
    },
  },
};
