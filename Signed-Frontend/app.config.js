import 'dotenv/config';

export default {
  expo: {
    name: "Signed-Frontend",
    slug: "Signed-Frontend",
    scheme: "signed",
    extra: {
      MACHINE_IP: process.env.MACHINE_IP,
    },
  },
};
