import 'dotenv/config';

export default {
  expo: {
    name: "Signed-Frontend",
    slug: "Signed-Frontend",
    extra: {
      MACHINE_IP: process.env.MACHINE_IP,
    },
  },
};
