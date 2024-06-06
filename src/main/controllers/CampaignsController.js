const Campaign = require('../db/models/tb_campaigns');
const Instance = require('../db/models/tb_instances');

const mercantil = require('./automation/Mercantil');

exports.createCampaign = async (req, res) => {
  try {
    const data = req.body;

    const selectInstance = await Instance.findAll({
      where: {
        instance: data.instance,
        status: 'LIVRE',
      }
    });

    if (selectInstance.length) {

      await Instance.update(
        { status: 'EM USO' },
        {
          where: {
            instance: data.instance,
          }
        }
      );

      const { name, company, records, file_data } = data;

      const insertCampaign = await Campaign.create({ name, company, records, file_data });
      
      mercantil({ 
        idCampaign: insertCampaign.id,
        instanceNumber: selectInstance[0].instance,
        user: selectInstance[0].user, 
        password: selectInstance[0].password, 
        timeLoggedIn: selectInstance[0].time_logged_in, 
        data: JSON.parse(file_data),
      });

      res.send();
    } else {
      res.status(400).json({ message: "Instância não encontrada ou está em uso" });
    }
  } catch (error) {
    res.status(400).json({ menssage: error.message });
  }
};