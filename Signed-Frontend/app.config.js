import 'dotenv/config';

export default {
  expo: {
    name: "Signed-Frontend",
    slug: "Signed-Frontend",
    scheme: "signedjobs",
    extra: {
      MACHINE_IP: process.env.MACHINE_IP,
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://signedapp.com",
        },
      ],
    ],
  },
};
