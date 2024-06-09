const Campaign = require('../db/models/tb_campaigns');
const Instance = require('../db/models/tb_instances');

const mercantil = require('./automation/Mercantil');

exports.createCampaign = async (req, res) => {
  try {
    const { name, company, records, file_data, instances } = req.body;

    const insertCampaign = await Campaign.create({ name, company, records, file_data });
    
    for (const ret of instances) {

        await Instance.update(
          { status: 'EM USO' },
          {
            where: {
              instance: ret.instance,
            }
          }
        );

        mercantil({ 
          idCampaign: insertCampaign.id,
          instanceNumber: ret.instance,
          user: ret.user, 
          password: ret.password, 
          timeLoggedIn: ret.time_logged_in, 
          data: JSON.parse(file_data),
        });
    }

    res.send();
  } catch (error) {
    res.status(400).json({ menssage: error.message });
  }
};