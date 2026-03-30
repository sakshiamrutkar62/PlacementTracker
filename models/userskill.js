'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserSkill extends Model {
        static associate(models) {
            UserSkill.belongsTo(models.User, { foreignKey: 'userId' });
            UserSkill.belongsTo(models.Skill, { foreignKey: 'skillId' });
        }
    }
    UserSkill.init({
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        skillId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'skills',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'UserSkill',
        tableName: 'user_skills',
    });
    return UserSkill;
};